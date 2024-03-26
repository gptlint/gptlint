import { ChatModel, Msg, createAIFunction } from '@dexaai/dexter'
import pMap from 'p-map'
import pRetry from 'p-retry'
import plur from 'plur'
import { z } from 'zod'

import type * as types from './types.js'
import { LinterCache } from './cache.js'
import { readFiles } from './read-files.js'

export async function lintFiles({
  inputFiles,
  rules,
  config,
  concurrency = 16
}: {
  inputFiles: string[]
  rules: types.Rule[]
  config: types.ResolvedLinterConfig
  concurrency?: number
}): Promise<types.LintResult> {
  const cache = new LinterCache({
    cacheDir: config.linterOptions.cacheDir,
    noCache: config.linterOptions.noCache
  })
  await cache.init()

  const files = await readFiles(inputFiles, { concurrency })

  const chatModel = new ChatModel({
    params: {
      model: config.linterOptions.model,
      temperature: config.linterOptions.temperature
    },
    debug: config.linterOptions.debugModel
  })

  // TODO: Add support for different types of file <> rule mappings
  const lintTasks = rules.flatMap((rule) =>
    files.map((file) => ({ file, rule }))
  )

  const lintResult: types.LintResult = {
    lintErrors: [],
    numModelCalls: 0,
    numModelCallsCached: 0,
    numPromptTokens: 0,
    numCompletionTokens: 0,
    numTotalTokens: 0,
    totalCost: 0
  }
  let earlyExitTripped = false

  await pMap(
    lintTasks,
    async ({ file, rule }) => {
      try {
        if (earlyExitTripped) {
          return []
        }

        const lintResultFile = await pRetry(
          () => lintFile({ file, rule, chatModel, cache, config }),
          {
            retries: 2
          }
        )

        lintResult.lintErrors = lintResult.lintErrors.concat(
          lintResultFile.lintErrors
        )
        lintResult.numModelCalls += lintResultFile.numModelCalls
        lintResult.numModelCallsCached += lintResultFile.numModelCallsCached
        lintResult.numPromptTokens += lintResultFile.numPromptTokens
        lintResult.numCompletionTokens += lintResultFile.numCompletionTokens
        lintResult.numTotalTokens += lintResultFile.numTotalTokens
        lintResult.totalCost += lintResultFile.totalCost

        if (lintResult.lintErrors.length && config.linterOptions.earlyExit) {
          earlyExitTripped = true
        }
      } catch (err: any) {
        const message = `Error: rule "${rule.name}" file "${file.filePath}" unexpected error: ${err.message}`
        console.error(message)
        throw new Error(message, { cause: err })
      }
    },
    {
      concurrency
    }
  )

  return lintResult
}

export async function lintFile({
  file,
  rule,
  chatModel,
  cache,
  config
}: {
  file: types.InputFile
  rule: types.Rule
  chatModel: ChatModel
  cache: LinterCache
  config: types.ResolvedLinterConfig
}): Promise<types.LintResult> {
  const lintResult: types.LintResult = {
    lintErrors: [],
    numModelCalls: 0,
    numModelCallsCached: 0,
    numPromptTokens: 0,
    numCompletionTokens: 0,
    numTotalTokens: 0,
    totalCost: 0
  }

  if (!file.content.trim()) {
    // Ignore empty files
    return lintResult
  }

  const cacheKey = {
    file,
    rule,
    params: chatModel.getParams()
  }
  const cachedResult = await cache.get(cacheKey)
  if (cachedResult) {
    lintResult.lintErrors = cachedResult.lintErrors
    lintResult.message = cachedResult.message
    lintResult.numModelCallsCached++

    if (config.linterOptions.debug) {
      const { lintErrors } = lintResult

      console.log(
        `CACHE HIT Rule "${rule.name}" file "${file.filePath}": ${
          lintErrors.length
        } ${plur('error', lintErrors.length)} found: ${lintResult.message}`,
        ...[lintErrors.length ? [lintErrors] : []]
      )
    }

    return lintResult
  }

  const recordRuleFailure = createAIFunction(
    {
      name: 'record_rule_failure',
      description:
        "Keeps track of snippets of code which fail to conform to the given rule's intent.",
      argsSchema: z.object({
        ruleName: z
          .string()
          .describe(
            'The name of the rule which this codeSnippet failed to conform to.'
          ),
        codeSnippet: z
          .string()
          .describe(
            'The offending code snippet which fails to conform to the given rule.'
          ),
        confidence: z
          .enum(['low', 'medium', 'high'])
          .describe('Your confidence that this error is correct.')
      })
    },
    async ({
      ruleName,
      codeSnippet,
      confidence
    }: {
      ruleName: string
      codeSnippet: string
      confidence: types.LintRuleErrorConfidence
    }) => {
      ruleName = ruleName.toLowerCase().trim()
      if (rule.name !== ruleName) {
        console.warn(
          `warning: rule "${rule.name}" LLM recorded error with unrecognized rule name "${ruleName}" on file "${file.filePath}"`
        )
      }

      lintResult.lintErrors.push({
        filePath: file.filePath,
        language: file.language,
        ruleName: rule.name,
        codeSnippet,
        confidence
      })
    }
  )

  if (config.linterOptions.debug) {
    console.log()
    console.log(`\n>>> Rule "${rule.name}" file "${file.filePath}"`)
  }

  const res = await chatModel.run({
    messages: [
      Msg.system(`You are an expert senior TypeScript software engineer at Vercel who loves to lint code. You make sure code conforms to project-specific guidelines and best practices. You will be given a code rule in the form of a description rule's intent and one or more positive and negative code snippets.
    
Your task is to take the given code and determine whether any portions of it violate the rule's intent. Accuracy is important, so be sure to think step-by-step before invoking the "record_rule_failure" function and include a "confidence" value so it's clear how confident you when detecting possible errors.`),

      Msg.system(`# Rule name "${rule.name}"

${rule.message}

${rule.desc}

${rule.negativeExamples?.length ? '## Incorrect Examples\n' : ''}
${rule.negativeExamples?.map(
  (example) => `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`
)}

${rule.positiveExamples?.length ? '## Correct Examples\n' : ''}
${rule.positiveExamples?.map(
  (example) => `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`
)}
`),

      Msg.user(`File: ${file.fileName}:`),
      Msg.user(file.content)
    ],
    tools: [
      {
        type: 'function',
        function: recordRuleFailure.spec
      }
    ]
  })

  if (res.message.content) {
    lintResult.message = res.message.content
  }

  if (res.cached) {
    lintResult.numModelCallsCached++
  } else {
    lintResult.numModelCalls++
  }

  if (res.cost) {
    lintResult.totalCost += res.cost
  }

  if (res.usage) {
    lintResult.numPromptTokens += res.usage.prompt_tokens
    lintResult.numCompletionTokens += res.usage.completion_tokens
    lintResult.numTotalTokens += res.usage.total_tokens
  }

  if (config.linterOptions.debug) {
    const { lintErrors } = lintResult

    console.log(
      `<<< Rule "${rule.name}" file "${file.filePath}": ${
        lintErrors.length
      } ${plur('error', lintErrors.length)} found: ${lintResult.message}`,
      ...[lintErrors.length ? [lintErrors] : []]
    )
  }

  await cache.set(cacheKey, lintResult)
  return lintResult
}
