import fs from 'node:fs/promises'
import path from 'node:path'

import { ChatModel, Msg } from '@dexaai/dexter'
import 'dotenv/config'
import hashObject from 'hash-object'
import pMap from 'p-map'

import type * as types from '../src/types.js'
import {
  findAllCodeBlockNodes,
  parseMarkdownAST
} from '../src/markdown-utils.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { resolveRules } from '../src/resolve-rules.js'
import { stringifyRuleForModel } from '../src/rule-utils.js'
import { inferBestPossibleCodeFileExtension } from '../src/utils.js'

/**
 * Internal CLI for generating eval data to evaluate rules.
 */
async function main() {
  const cwd = process.cwd()
  const concurrency = 16

  const { args, linterConfig: config } = await resolveLinterCLIConfig(
    process.argv,
    { cwd }
  )

  let rules: types.Rule[]

  try {
    rules = await resolveRules({ cwd, config, concurrency })
  } catch (err: any) {
    console.error(err.message)
    args.showHelp()
    process.exit(1)
  }

  if (config.linterOptions.debugConfig) {
    console.log(
      '\nlogging resolved config and then exiting because `debugConfig` is enabled'
    )
    console.log('\nconfig', JSON.stringify(config, null, 2))
    console.log('\nrules', JSON.stringify(rules, null, 2))
    process.exit(0)
  }

  const chatModel = new ChatModel({
    params: {
      model: config.linterOptions.model,
      temperature: config.linterOptions.temperature
    },
    debug: config.linterOptions.debugModel
  })

  const numExamples = 5
  const outputDir = path.join('fixtures', 'evals')
  await fs.mkdir(outputDir, { recursive: true })

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
              `Generate ${numExamples} diverse code snippets which CORRECTLY adhere to the given rule. Separate each code snippet within markdown code blocks. Include brief comments inside each code snippet which explain why the code CORRECTLY adheres to the given rule. Do not include any prose or descriptions outside of the code blocks.`
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
          const content = codeBlock.value.trim()
          if (!content) continue
          const fileHash = hashObject(
            { fileType, content },
            { algorithm: 'sha256' }
          ).slice(0, 8)
          const fileName = `${fileHash}.${fileType}`
          const filePath = path.join(positiveRuleExamplesDir, fileName)
          await fs.writeFile(filePath, content, { encoding: 'utf-8' })
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
              `Generate ${numExamples} diverse code snippets which VIOLATE the given rule. Separate each code snippet within markdown code blocks. Include brief comments inside each code snippet which explain why the code VIOLATES to the given rule. Do not include any prose or descriptions outside of the code blocks.`
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
          const content = codeBlock.value.trim()
          if (!content) continue
          const fileHash = hashObject(
            { fileType, content },
            { algorithm: 'sha256' }
          ).slice(0, 8)
          const fileName = [fileHash, fileType].filter(Boolean).join('.')
          const filePath = path.join(negativeRuleExamplesDir, fileName)
          await fs.writeFile(filePath, content, { encoding: 'utf-8' })
        }
      }
    },
    {
      concurrency: 8
    }
  )
  // TODO
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
