import { type ChatModel, Msg, type Prompt } from '@dexaai/dexter'
import type { Code } from 'mdast'
import { toString } from 'mdast-util-to-string'
// import pRetry, { type Options as RetryOptions } from 'p-retry'
import plur from 'plur'
import { z } from 'zod'

import type * as types from './types.js'
import { AbortError, RetryableError } from './errors.js'
import {
  findAllBetween,
  findAllCodeBlockNodes,
  findAllHeadingNodes,
  parseMarkdownAST
} from './markdown-utils.js'
import { safeParseStructuredOutput } from './parse-structured-output.js'
import { stringifyRuleForModel } from './rule-utils.js'
import { createLintResult, trimMessage } from './utils.js'

// export async function lintFile({
//   file,
//   rule,
//   chatModel,
//   config,
//   retryOptions = {
//     retries: 2
//   }
// }: {
//   file: types.InputFile
//   rule: types.Rule
//   chatModel: ChatModel
//   config: types.ResolvedLinterConfig
//   retryOptions?: RetryOptions
// }): Promise<types.LintResult> {
//   return pRetry(
//     () =>
//       lintFileImpl({
//         file,
//         rule,
//         chatModel,
//         config
//       }),
//     retryOptions
//   )
// }

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
  retryOptions?: {
    retries: number
  }
}): Promise<types.LintResult> {
  const lintResult = createLintResult()

  const ruleViolationSchema = z.object({
    ruleName: z
      .string()
      .optional()
      .describe('The name of the RULE which this `codeSnippet` violates.'),
    codeSnippet: z
      .string()
      .describe(
        'The offending code snippet which fails to conform to the given RULE. This code snippet must come verbatim from the given SOURCE.'
      ),
    codeSnippetSource: z.enum(['examples', 'source']).optional().describe(
      // TODO: possibly use SOURCE ${file.fileRelativePath}
      `Where the \`codeSnippet\` comes from. If it comes from the RULE "${rule.name}" examples, then use "examples". If it comes from the SOURCE, then use "source".`
    ),
    reasoning: z
      .string()
      .optional()
      .describe(
        'An explanation of why this code snippet VIOLATES the RULE. Think step-by-step when describing your reasoning.'
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
  type RuleViolation = z.infer<typeof ruleViolationSchema>

  const ruleViolationsOutputSchema = z.array(ruleViolationSchema)

  function recordRuleViolation({
    ruleName,
    codeSnippet,
    codeSnippetSource,
    reasoning,
    violation,
    confidence
  }: RuleViolation) {
    ruleName = ruleName?.toLowerCase().trim()

    if (!violation || confidence !== 'high' || codeSnippetSource !== 'source') {
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

    if (ruleName && rule.name !== ruleName) {
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

  if (config.linterOptions.debug) {
    console.log(`>>> Rule "${rule.name}" file "${file.fileRelativePath}"`)
  }

  const messages: Prompt.Msg[] = [
    Msg.system(`# INSTRUCTIONS

You are an expert senior TypeScript software engineer at Vercel who loves to lint code. You make sure source code conforms to project-specific guidelines and best practices. You will be given a RULE with a description of the RULE's intent and some positive examples where the RULE is used correctly and some negative examples where the RULE is VIOLATED (used incorrectly).

Your task is to take the given SOURCE code and determine whether any portions of it VIOLATE the RULE's intent.

${stringifyRuleForModel(rule)}

---
`),
    Msg.system(`# SOURCE ${file.fileName}:\n\n${file.content}`),
    Msg.system(`# TASK

List out the portions of the SOURCE code ${file.fileName} which are related to the RULE and explain whether they VIOLATE or conform to the RULE's intent. Your answer should contain two markdown sections, EXPLANATION and VIOLATIONS.

Accuracy is important, so be sure to think step-by-step and explain your reasoning in the EXPLANATION section.

If you find any code snippets which VIOLATE the RULE, then output them as RULE_VIOLATION objects in the VIOLATIONS section. The VIOLATIONS section should be a JSON array of RULE_VIOLATION objects. This array may be empty if there are no RULE VIOLATIONS. Ignore code snippets which correctly conform to the RULE.

RULE_VIOLATION schema:

\`\`\`ts
interface RULE_VIOLATION {
  // The name of the RULE which this \`codeSnippet\` violates.
  ruleName: string

  // The offending code snippet which fails to conform to the given RULE. This code snippet must come verbatim from the given SOURCE.
  codeSnippet: string

  // Where the \`codeSnippet\` comes from. If it comes from the RULE "${rule.name}" examples, then use "examples". If it comes from the SOURCE, then use "source".
  codeSnippetSource: 'examples' | 'source'

  // An explanation of why this code snippet VIOLATES the RULE. Think step-by-step when describing your reasoning.
  reasoning: string

  // Whether or not this \`codeSnippet\` violates the RULE. If this \`codeSnippet\` does VIOLATE the RULE, then \`violation\` should be \`true\`. If the \`codeSnippet\` conforms to the RULE correctly or does not appear in the SOURCE, then \`violation\` should be \`false\`.
  violation: boolean

  // Your confidence that the \`codeSnippet\` VIOLATES the RULE.
  confidence: 'low' | 'medium' | 'high'
}
\`\`\`

---

Example output format:

# EXPLANATION

Plain text explanation of the SOURCE and reasoning for any potential VIOLATIONS.

# VIOLATIONS

\`\`\`json
[
  {
    "ruleName": "${rule.name}",
    "codeSnippet": "...",
    "codeSnippetSource": "source",
    "reasoning": "..."
    "violation": true,
    "confidence": "high",
  }
]
\`\`\`
`)
  ]

  let retries = retryOptions.retries

  do {
    let response: string

    try {
      const res = await chatModel.run({
        messages
      })

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

      response = res.message.content!
      if (config.linterOptions.debug) {
        console.log(
          `\nrule "${rule.name}" file "${file.fileRelativePath}" response\n${response}\n\n`
        )
      }

      messages.push(Msg.assistant(response))

      const ast = parseMarkdownAST(response)
      const codeBlocksNodes = findAllCodeBlockNodes(ast)
      let codeBlockNode: Code | undefined

      if (codeBlocksNodes.length === 0) {
        throw new RetryableError(
          'Invalid output: missing VIOLATIONS code block which should contain an array of RULE_VIOLATION objects.'
        )
      } else if (codeBlocksNodes.length > 1) {
        const h1Nodes = findAllHeadingNodes(ast, { depth: 1 })

        if (h1Nodes.length === 0) {
          throw new RetryableError(
            'Invalid output: missing EXPLANATION and VIOLATIONS header sections.'
          )
        } else {
          const headers = h1Nodes.map((node) =>
            toString(node).toLowerCase().trim()
          )
          const violationsHeaderIndex = headers.findLastIndex((header) =>
            /violation/i.test(header)
          )

          if (violationsHeaderIndex < 0) {
            throw new RetryableError(
              'Invalid output: missing VIOLATIONS header section which should contain a json code block with an array of RULE_VIOLATION objects.'
            )
          }

          const violationsNode = h1Nodes[violationsHeaderIndex]!
          const violationsBodyNodes = findAllBetween(ast, violationsNode)
          let violationsCodeBlocksNodes = findAllCodeBlockNodes({
            type: 'root',
            children: violationsBodyNodes as any
          })

          if (violationsCodeBlocksNodes.length > 1) {
            const jsonViolationCodeBlockNodes =
              violationsCodeBlocksNodes.filter((node) => node.lang === 'json')

            if (jsonViolationCodeBlockNodes.length === 0) {
              const parseableCodeBlockNodes = violationsCodeBlocksNodes.filter(
                (node) =>
                  safeParseStructuredOutput(
                    node.value,
                    ruleViolationsOutputSchema
                  ).success
              )

              if (parseableCodeBlockNodes.length === 0) {
                // Ignore and fallback to retrying anyway below
              } else if (parseableCodeBlockNodes.length >= 1) {
                violationsCodeBlocksNodes = parseableCodeBlockNodes
              }
            } else if (jsonViolationCodeBlockNodes.length === 1) {
              violationsCodeBlocksNodes = jsonViolationCodeBlockNodes
            }
          }

          if (!violationsCodeBlocksNodes.length) {
            throw new RetryableError(
              'Invalid output: missing a valid json code block with an array of RULE_VIOLATION objects.'
            )
          } else if (violationsCodeBlocksNodes.length > 1) {
            throw new RetryableError(
              'Invalid output: the VIOLATIONS section should contain a single json code block with an array of RULE_VIOLATION objects.'
            )
          } else {
            codeBlockNode = violationsCodeBlocksNodes[0]!
          }
        }
      } else {
        // TODO
        codeBlockNode = codeBlocksNodes[0]!
      }

      if (!codeBlockNode) {
        throw new RetryableError(
          'Invalid output: the VIOLATIONS section should contain a single json code block with an array of RULE_VIOLATION objects.'
        )
      }

      const parsedRuleViolationsResult = safeParseStructuredOutput(
        codeBlockNode!.value,
        ruleViolationsOutputSchema
      )

      if (!parsedRuleViolationsResult.success) {
        throw new RetryableError(
          `Invalid output: the VIOLATIONS code block does not contain valid RULE_VIOLATION objects. Please make sure the RULE_VIOLATION objects are formatted correctly according to their schema. Parser error: ${parsedRuleViolationsResult.error}`
        )
      } else {
        const ruleViolations = parsedRuleViolationsResult.data

        for (const ruleViolation of ruleViolations) {
          recordRuleViolation(ruleViolation)
        }

        // Successfully parsed the output of this task
        break
      }
    } catch (err: any) {
      if (retries-- <= 0) {
        throw err
      }

      if (err instanceof AbortError || err.name === 'AbortError') {
        throw err
      }

      if (err instanceof RetryableError) {
        // TODO
        console.warn(
          `\nRETRYING ERROR rule "${rule.name}" file "${file.fileRelativePath}": ${err.message}\n\n`
        )

        // Retry
        const errMessage = err.message
        messages.push(
          Msg.user(
            `There was an error validating the response. Please check the error message and try again.\nError:\n${errMessage}`
          )
        )
      } else {
        console.warn('Retrying after unexpected error', err)
      }
    }
  } while (true)

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
