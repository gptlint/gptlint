#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { Msg } from '@dexaai/dexter'
import 'dotenv/config'
import { gracefulExit } from 'exit-hook'
import hashObject from 'hash-object'
import pMap from 'p-map'

import type * as types from '../src/types.js'
import { createChatModel } from '../src/create-chat-model.js'
import { formatSource } from '../src/formatter.js'
import {
  findAllCodeBlockNodes,
  parseMarkdownAST
} from '../src/markdown-utils.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { resolveRules } from '../src/resolve-rules.js'
import { stringifyRuleForModel } from '../src/rule-utils.js'
import {
  inferBestPossibleCodeFileExtension,
  logDebugConfig,
  omit
} from '../src/utils.js'

/**
 * Internal CLI to generate synthetic eval data (code snippets) for rules.
 */
async function main() {
  const cwd = process.cwd()
  const concurrency = 16

  const { args, linterConfig: config } = await resolveLinterCLIConfig(
    process.argv,
    {
      cwd,
      linterConfigDefaults: {
        llmOptions: {
          // Use GPT-4 as the default for evals
          model: 'gpt-4-turbo-preview'
        }
      }
    }
  )

  let rules: types.Rule[]

  try {
    rules = await resolveRules({ cwd, config, concurrency })
  } catch (err: any) {
    console.error(err.message)
    args.showHelp()
    return gracefulExit(1)
  }

  if (config.linterOptions.debugConfig) {
    logDebugConfig({ rules, config })
    return gracefulExit(0)
  }

  const chatModel = createChatModel(config)

  const numExamples = 5
  const outputDir = path.join('fixtures', 'evals')
  await fs.mkdir(outputDir, { recursive: true })

  const llmStats = {
    totalCost: 0,
    numPromptTokens: 0,
    numCompletionTokens: 0,
    numTotalTokens: 0
  }

  await pMap(
    rules,
    async function generateEvalsForRule(rule) {
      const ruleExamplesDir = path.join(outputDir, rule.name)

      {
        // Positive examples
        const positiveRuleExamplesDir = path.join(ruleExamplesDir, 'correct')
        await fs.mkdir(positiveRuleExamplesDir, { recursive: true })

        const res = await chatModel.run({
          messages: [
            Msg.system(
              `You are an expert senior TypeScript software engineer at Vercel who loves to lint code.`
            ),
            Msg.system(stringifyRuleForModel(rule)),
            Msg.user(
              `Generate ${numExamples} diverse code snippets which CORRECTLY adhere to the given RULE. Separate each code snippet within markdown code blocks. Include brief comments inside each code snippet which explain why the code CORRECTLY adheres to the given RULE. Do not include any prose or descriptions outside of the code blocks.`
            )
          ]
        })

        console.log(`\n${rule.name} correct examples:\n`, res.message.content)

        const ast = parseMarkdownAST(res.message.content!)
        const codeBlocks = findAllCodeBlockNodes(ast)

        for (const codeBlock of codeBlocks) {
          const fileType = inferBestPossibleCodeFileExtension(codeBlock.lang, {
            fallbacks: rule.languages
          })
          let content = codeBlock.value.trim()
          if (!content) continue
          try {
            const commentToken = fileType === 'py' ? '#' : '//'
            content = `${content}\n\n${commentToken} Generated by ${res.model}`
            content = await formatSource(content, { fileType })
          } catch (err) {}
          const fileHash = hashObject(
            { fileType, content },
            { algorithm: 'sha256' }
          ).slice(0, 8)
          const fileName = `${fileHash}.${fileType}`
          const filePath = path.join(positiveRuleExamplesDir, fileName)
          await fs.writeFile(filePath, content, { encoding: 'utf-8' })
        }

        if (res.cost) {
          llmStats.totalCost += res.cost
        }

        if (res.usage) {
          llmStats.numPromptTokens += res.usage.prompt_tokens
          llmStats.numCompletionTokens += res.usage.completion_tokens
          llmStats.numTotalTokens += res.usage.total_tokens
        }
      }

      {
        // Negative examples
        const negativeRuleExamplesDir = path.join(ruleExamplesDir, 'incorrect')
        await fs.mkdir(negativeRuleExamplesDir, { recursive: true })

        const res = await chatModel.run({
          messages: [
            Msg.system(
              `You are an expert senior TypeScript software engineer at Vercel who loves to lint code.`
            ),
            Msg.system(stringifyRuleForModel(rule)),
            Msg.user(
              `Generate ${numExamples} diverse code snippets which VIOLATE the given RULE. Separate each code snippet within markdown code blocks. Include brief comments inside each code snippet which explain why the code VIOLATES to the given RULE. Do not include any prose or descriptions outside of the code blocks.`
            )
          ]
        })

        console.log(`\n${rule.name} incorrect examples:\n`, res.message.content)

        const ast = parseMarkdownAST(res.message.content!)
        const codeBlocks = findAllCodeBlockNodes(ast)

        for (const codeBlock of codeBlocks) {
          const fileType = inferBestPossibleCodeFileExtension(codeBlock.lang, {
            fallbacks: rule.languages
          })
          let content = codeBlock.value.trim()
          if (!content) continue
          try {
            const commentToken = fileType === 'py' ? '#' : '//'
            content = `${content}\n\n${commentToken} Generated by ${res.model}`
            content = await formatSource(content, { fileType })
          } catch (err) {}
          const fileHash = hashObject(
            { fileType, content },
            { algorithm: 'sha256' }
          ).slice(0, 8)
          const fileName = [fileHash, fileType].filter(Boolean).join('.')
          const filePath = path.join(negativeRuleExamplesDir, fileName)
          await fs.writeFile(filePath, content, { encoding: 'utf-8' })
        }

        if (res.cost) {
          llmStats.totalCost += res.cost
        }

        if (res.usage) {
          llmStats.numPromptTokens += res.usage.prompt_tokens
          llmStats.numCompletionTokens += res.usage.completion_tokens
          llmStats.numTotalTokens += res.usage.total_tokens
        }
      }
    },
    {
      concurrency: 8
    }
  )

  if (config.linterOptions.debugStats) {
    console.log(
      `\nLLM stats; total cost $${(llmStats.totalCost / 100).toFixed(2)}`,
      {
        model: config.llmOptions.model,
        ...omit(llmStats, 'totalCost')
      }
    )
  }
}

main().catch((err) => {
  console.error(err)
  return gracefulExit(1)
})
