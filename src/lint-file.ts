import { type ChatModel, Msg, type Prompt } from '@dexaai/dexter'
import plur from 'plur'

import type * as types from './types.js'
import { AbortError, RetryableError } from './errors.js'
import { stringifyRuleForModel } from './rule-utils.js'
import {
  parseRuleViolationsFromModelResponse,
  type RuleViolation,
  stringifyRuleViolationSchemaForModel
} from './rule-violations.js'
import { createLintResult } from './utils.js'

/**
 * Core linting logic which takes in a single `rule` and a single `file` and
 * uses the `chatModel` LLM to extract rule violations using structured output.
 */
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
      // Ignore any false positives
      return
    }

    if (ruleName && rule.name !== ruleName) {
      console.warn(
        `warning: rule "${rule.name}" LLM recorded error with unrecognized rule name "${ruleName}" on file "${file.fileRelativePath}"`
      )

      return
    }

    // TODO: need a better way to determine if the violation is from the RULE's negative examples or the SOURCE

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

# SOURCE ${file.fileName}:

${file.content}
`),

    Msg.user(`# TASK

List out the portions of the SOURCE code ${
      file.fileName
    } which are related to the RULE and explain whether they VIOLATE or conform to the RULE's intent. Your answer should contain two markdown sections, EXPLANATION and VIOLATIONS.

Accuracy is important, so be sure to think step-by-step and explain your reasoning in the EXPLANATION section.

If you find any code snippets which VIOLATE the RULE, then output them as RULE_VIOLATION objects in the VIOLATIONS section. The VIOLATIONS section should be a JSON array of RULE_VIOLATION objects. This array may be empty if there are no RULE VIOLATIONS. Ignore code snippets which correctly conform to the RULE.

RULE_VIOLATION schema:

${stringifyRuleViolationSchemaForModel(rule)}

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

      response = res.message.content!
      lintResult.message = response

      if (config.linterOptions.debug) {
        console.log(
          `\nrule "${rule.name}" file "${file.fileRelativePath}" response:\n\n ${response}\n\n`
        )
      }

      messages.push(Msg.assistant(response))

      if (res.cached) {
        lintResult.numModelCallsCached++
      } else {
        lintResult.numModelCalls++
      }

      if (res.cost) {
        lintResult.totalCost += res.cost
      } else if ((res.usage as any)?.total_cost) {
        lintResult.totalCost += 100 * (res.usage as any).total_cost
      }

      if (res.usage) {
        lintResult.numPromptTokens += res.usage.prompt_tokens
        lintResult.numCompletionTokens += res.usage.completion_tokens
        lintResult.numTotalTokens += res.usage.total_tokens
      }

      const ruleViolations = parseRuleViolationsFromModelResponse(response)
      for (const ruleViolation of ruleViolations) {
        recordRuleViolation(ruleViolation)
      }

      // We've successfully processed the model output, so break out of the
      // retry loop.
      break
    } catch (err: any) {
      if (err instanceof AbortError || err.name === 'AbortError') {
        throw err
      }

      if (retries-- <= 0) {
        throw err
      }

      if (err instanceof RetryableError) {
        if (config.linterOptions.debug) {
          console.warn(
            `\nRETRYING error processing rule "${rule.name}" file "${file.fileRelativePath}": ${err.message}\n\n`
          )
        }

        // Retry
        const errMessage = err.message
        messages.push(
          Msg.user(
            `There was an error validating the response. Please check the error message and try again.\nError:\n${errMessage}`
          )
        )
      } else {
        throw new TypeError(
          `Unexpected error processing rule "${rule.name}" file "${file.fileRelativePath}": ${err.message}`,
          { cause: err }
        )
      }
    }
  } while (true)

  if (config.linterOptions.debug) {
    const { lintErrors } = lintResult

    if (lintErrors.length > 0) {
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
        }": ${lintErrors.length} ${plur('error', lintErrors.length)} found`
      )
    }
  }

  return lintResult
}
