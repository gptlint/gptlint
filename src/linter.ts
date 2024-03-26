import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { ChatModel, Msg, createAIFunction } from '@dexaai/dexter'
import pMap from 'p-map'
import pRetry from 'p-retry'
import plur from 'plur'
import { z } from 'zod'

import type * as types from './types.js'

export async function lintFiles({
  inputFiles,
  guidelines,
  earlyExit = false,
  concurrency = 16,
  debug = false
}: {
  inputFiles: string[]
  guidelines: types.Rule[]
  earlyExit?: boolean
  concurrency?: number
  debug?: boolean
}): Promise<types.LintError[]> {
  const files = await readFiles(inputFiles, { concurrency })

  const chatModel = new ChatModel({
    params: {
      model: 'gpt-4-turbo-preview'
    },
    debug
  })

  const lintTasks = guidelines.flatMap((rule) =>
    files.map((file) => ({ file, rule }))
  )

  let earlyExitTripped = false

  return (
    await pMap(
      lintTasks,
      async ({ file, rule }) => {
        try {
          if (earlyExitTripped) {
            return []
          }

          const lintErrors = await pRetry(
            () => lintFile({ file, rule, chatModel, debug }),
            {
              retries: 2
            }
          )

          if (lintErrors.length && earlyExit) {
            earlyExitTripped = true
          }

          return lintErrors
        } catch (err: any) {
          const message = `error: rule "${rule.name}" file "${file.filePath}" unexpected error: ${err.message}`
          console.error(message)
          throw new Error(message, { cause: err })
        }
      },
      {
        concurrency
      }
    )
  ).flat()
}

export async function lintFile({
  file,
  rule,
  chatModel,
  debug = false
}: {
  file: types.InputFile
  rule: types.Rule
  chatModel: ChatModel
  debug?: boolean
}): Promise<types.LintError[]> {
  const lintErrors: types.LintError[] = []

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
    // Fake weather API implementation which returns a random temperature
    // after a short delay
    async ({
      ruleName,
      codeSnippet,
      confidence
    }: {
      ruleName: string
      codeSnippet: string
      confidence: types.LintRuleErrorConfidence
    }) => {
      // TODO: ensure ruleName === rule.name
      ruleName = ruleName.toLowerCase().trim()
      if (rule.name !== ruleName) {
        console.warn(
          `warning: rule "${rule.name}" LLM recorded error with unrecognized rule name "${ruleName}" on file "${file.filePath}"`
        )
      }

      lintErrors.push({
        filePath: file.filePath,
        language: file.language,
        ruleName: rule.name,
        codeSnippet,
        confidence
      })
    }
  )

  const res = await chatModel.run({
    temperature: 0,
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

  if (debug) {
    console.log(
      `Rule "${rule.name}" file "${file.filePath}": ${lintErrors.length} ${plur(
        'error',
        lintErrors.length
      )} found: ${res.message}`,
      ...[lintErrors.length ? [lintErrors] : []]
    )
  }

  return lintErrors
}

export async function readFiles(
  filePaths: string[],
  {
    concurrency = 16
  }: {
    concurrency?: number
  } = {}
): Promise<types.InputFile[]> {
  return pMap(
    filePaths,
    async (filePath) => {
      const content = await readFile(filePath, { encoding: 'utf-8' })

      // TODO: improve this

      const ext = filePath.split('.').at(-1)!
      const fileName = basename(filePath)
      const jsExtensions = new Set(['js', 'jsx', 'cjs', 'mjs'])
      const tsExtensions = new Set(['js', 'jsx'])
      const language = jsExtensions.has(ext)
        ? 'javascript'
        : tsExtensions.has(ext)
        ? 'typescript'
        : 'unknown'

      return {
        filePath,
        fileName,
        language,
        content
      }
    },
    {
      concurrency
    }
  )
}
