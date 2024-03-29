import {
  type ChatModel,
  Msg,
  createAIFunction,
  handleFunctionCallMessage
} from '@dexaai/dexter'
import pRetry, { type Options as RetryOptions } from 'p-retry'
import plur from 'plur'
import { z } from 'zod'

import type * as types from './types.js'
import { stringifyRuleForModel } from './rule-utils.js'
import { createLintResult, trimMessage } from './utils.js'

export async function lintFile({
  file,
  rule,
  chatModel,
  config,
  retryOptions = {
    retries: 2
  }
}: {
  file: types.InputFile
  rule: types.Rule
  chatModel: ChatModel
  config: types.ResolvedLinterConfig
  retryOptions?: RetryOptions
}): Promise<types.LintResult> {
  return pRetry(
    () =>
      lintFileImpl({
        file,
        rule,
        chatModel,
        config
      }),
    retryOptions
  )
}

export async function lintFileImpl({
  file,
  rule,
  chatModel,
  config
}: {
  file: types.InputFile
  rule: types.Rule
  chatModel: ChatModel
  config: types.ResolvedLinterConfig
}): Promise<types.LintResult> {
  const lintResult = createLintResult()

  const recordRuleFailure = createAIFunction(
    {
      name: 'record_rule_violation',
      description: `This function should only be called for code snippets appearing in the SOURCE which VIOLATE the RULE's intent.

DO NOT call this function for code snippets which conform correctly to the RULE.
DO NOT call this function for example code snippets from the RULE or for code snippets which don't appear in the SOURCE.`,
      argsSchema: z.object({
        ruleName: z
          .string()
          .describe('The name of the RULE which this `codeSnippet` violates.'),
        codeSnippet: z
          .string()
          .describe(
            'The offending code snippet which fails to conform to the given RULE. This code snippet must come verbatim from the given SOURCE.'
          ),
        codeSnippetSource: z.enum(['examples', 'source']).describe(
          // TODO: possibly use SOURCE ${file.fileRelativePath}
          `Where the codeSnippet comes from. If it comes from the RULE "${rule.name}" examples, then use "examples". If it comes from the SOURCE, then use "source".`
        ),
        reasoning: z
          .string()
          .describe(
            'An explanation of why this code snippet VIOLATES the given RULE. Think step-by-step when describing your reasoning.'
          ),
        violation: z
          .boolean()
          .describe(
            'Whether or not this `codeSnippet` violates the RULE. If the `codeSnippet` does VIOLATE the RULE, then `violation` should be `true`. If the `codeSnippet` conforms to the RULE correctly or does not appear in the SOURCE, then `violation` should be `false`.'
          ),
        confidence: z
          .enum(['low', 'medium', 'high'])
          .describe('Your confidence that the `codeSnippet` VIOLATES the RULE.')
      })
    },
    async ({
      ruleName,
      codeSnippet,
      codeSnippetSource,
      violation,
      confidence,
      reasoning
    }: {
      ruleName: string
      codeSnippet: string
      codeSnippetSource: string
      violation: boolean
      confidence: types.LintRuleErrorConfidence
      reasoning: string
    }) => {
      ruleName = ruleName.toLowerCase().trim()

      if (
        !violation ||
        confidence !== 'high' ||
        codeSnippetSource !== 'source'
      ) {
        // console.warn(
        //   `warning: rule "${rule.name}" file "${file.fileRelativePath}": ignoring false positive`,
        //   {
        //     violation,
        //     confidence,
        //     codeSnippet,
        //     codeSnippetSource,
        //     reasoning
        //   }
        // )

        // Ignore any false positives
        return
      }

      if (rule.name !== ruleName) {
        console.warn(
          `warning: rule "${rule.name}" LLM recorded error with unrecognized rule name "${ruleName}" on file "${file.fileRelativePath}"`
        )

        return
      }

      if (rule.negativeExamples) {
        // TODO: need a better way to determine if the violation is from the RULE's negative examples or the SOURCE
        for (const negativeExample of rule.negativeExamples) {
          if (negativeExample.code.indexOf(codeSnippet) >= 0) {
            // TODO: this whole approach needs to be reworked
            // console.warn(
            //   `warning: rule "${rule.name}" file "${file.fileRelativePath}": ignoring false positive from examples`,
            //   {
            //     violation,
            //     confidence,
            //     codeSnippet,
            //     codeSnippetSource,
            //     reasoning,
            //     negativeExample
            //   }
            // )

            return
          }
        }
      }

      // TODO: possibly if codeSnippet doesn't appear in the source (or something close to it), then ignore this as a false positive

      lintResult.lintErrors.push({
        filePath: file.filePath,
        language: file.language,
        ruleName: rule.name,
        codeSnippet,
        confidence,
        reasoning
      })
    }
  )

  if (config.linterOptions.debug) {
    console.log(`>>> Rule "${rule.name}" file "${file.fileRelativePath}"`)
  }

  const res = await chatModel.run({
    messages: [
      Msg.system(`# INSTRUCTIONS

You are an expert senior TypeScript software engineer at Vercel who loves to lint code. You make sure source code conforms to project-specific guidelines and best practices. You will be given a RULE with a description of the RULE's intent and some positive examples where the RULE is used correctly and some negative examples where the RULE is VIOLATED (used incorrectly).

Your task is to take the given SOURCE code and determine whether any portions of it VIOLATE the RULE's intent. Accuracy is important, so be sure to think step-by-step before invoking the \`record_rule_violation\` function and include \`reasoning\` and \`confidence\` to make it clear why any given \`codeSnippet\` VIOLATES the RULE.

${stringifyRuleForModel(rule)}

---
`),
      Msg.system(`# SOURCE ${file.fileName}:\n\n${file.content}`)
    ],
    tools: [
      {
        type: 'function',
        function: recordRuleFailure.spec
      }
    ]
  })

  switch (res.message.role) {
    case 'assistant':
      if (res.message.content) {
        lintResult.message = res.message.content
      }

      try {
        await handleFunctionCallMessage({
          message: res.message,
          functions: [recordRuleFailure],
          functionCallConcurrency: 8
        })
      } catch (err: any) {
        // TODO: handle "multi_tool_use.parallel" openai tool calling bug
        // @see https://community.openai.com/t/model-tries-to-call-unknown-function-multi-tool-use-parallel/490653
        console.warn(
          `warning: rule "${rule.name}" file "${file.fileRelativePath}" unexpected LLM error`,
          err.message,
          JSON.stringify(res.message.tool_calls, null, 2)
        )
      }
      break

    default:
      console.warn(
        `warning: rule "${rule.name}" LLM unexpected response message role "${res.message.role}" for file "${file.fileRelativePath}"`,
        res.message
      )
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

    if (lintErrors.length) {
      console.log(
        `\n<<< FAIL CACHE MISS Rule "${rule.name}" file "${
          file.fileRelativePath
        }": ${lintErrors.length} ${plur('error', lintErrors.length)} found:`,
        lintErrors
      )
    } else {
      console.log(
        `\n<<< PASS CACHE MISS Rule "${rule.name}" file "${
          file.fileRelativePath
        }": ${lintErrors.length} ${plur(
          'error',
          lintErrors.length
        )} found: ${trimMessage(lintResult.message)}`
      )
    }
  }

  return lintResult
}
