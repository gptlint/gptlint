import { type ChatModel, Msg, type Prompt } from '@dexaai/dexter'
import plur from 'plur'

import type * as types from './types.js'
import { AbortError, RetryableError } from './errors.js'
import { safeParseStructuredOutput } from './parse-structured-output.js'
import { stringifyRuleForModel } from './rule-utils.js'
import {
  parseRuleViolationsFromModelResponse,
  type RuleViolation,
  ruleViolationsValidatedOutputSchema,
  stringifyRuleViolationForModel,
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
  let lintResult = createLintResult()

  if (config.linterOptions.debug) {
    console.log(
      `>>> Linting Rule "${rule.name}" file "${file.fileRelativePath}"`
    )
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
      const model = config.llmOptions.weakModel ?? config.llmOptions.model
      const res = await chatModel.run({
        model,
        messages
      })

      response = res.message.content!
      lintResult.message = response

      if (config.linterOptions.debug) {
        console.log(
          `\nrule "${rule.name}" file "${file.fileRelativePath}" response from model "${model}":\n\n${response}\n\n`
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
        const {
          violation,
          confidence,
          codeSnippet,
          codeSnippetSource,
          reasoning
        } = ruleViolation

        if (
          !violation ||
          confidence !== 'high' ||
          codeSnippetSource !== 'source'
        ) {
          // Ignore any false positives
          continue
        }

        const ruleName = ruleViolation.ruleName?.toLowerCase().trim()
        if (ruleName && rule.name !== ruleName) {
          console.warn(
            `warning: rule "${rule.name}" LLM recorded error with unrecognized rule name "${ruleName}" on file "${file.fileRelativePath}"`
          )

          continue
        }

        // TODO: need a better way to determine if the violation is from the RULE's negative examples or the SOURCE

        lintResult.lintErrors.push({
          filePath: file.filePath,
          language: file.language,
          ruleName: rule.name,
          model,
          codeSnippet,
          confidence,
          reasoning
        })
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

  if (lintResult.lintErrors.length > 0 && config.llmOptions.weakModel) {
    const { lintErrors: originalLintErrors } = lintResult
    if (config.linterOptions.debug) {
      console.log(
        `\n>>> VALIDATING ${originalLintErrors.length} ${plur(
          'error',
          originalLintErrors.length
        )} for rule "${rule.name}" file "${file.fileRelativePath}":`,
        originalLintErrors
      )
    }

    lintResult = await validateRuleViolations({
      file,
      rule,
      lintResult,
      chatModel,
      config,
      retryOptions
    })

    if (config.linterOptions.debug) {
      const { lintErrors } = lintResult

      console.log(
        `\n<<< DONE VALIDATING ${originalLintErrors.length} ${plur(
          'error',
          originalLintErrors.length
        )} ⇒ ${lintErrors.length} ${plur(
          'error',
          lintErrors.length
        )} for rule "${rule.name}" file "${file.fileRelativePath}":`,
        lintErrors
      )
    }
  }

  if (config.linterOptions.debug) {
    const { lintErrors } = lintResult

    if (lintErrors.length > 0) {
      console.log(
        `\n<<< FAIL Rule "${rule.name}" file "${file.fileRelativePath}": ${
          lintErrors.length
        } ${plur('error', lintErrors.length)} found:`,
        lintErrors
      )
    } else {
      console.log(
        `\n<<< PASS Rule "${rule.name}" file "${file.fileRelativePath}"`
      )
    }
  }

  return lintResult
}

export async function validateRuleViolations({
  file,
  rule,
  lintResult,
  chatModel,
  config,
  retryOptions = {
    retries: 2
  }
}: {
  file: types.InputFile
  rule: types.Rule
  lintResult: types.LintResult
  chatModel: ChatModel
  config: types.ResolvedLinterConfig
  retryOptions?: {
    retries: number
  }
}): Promise<types.LintResult> {
  const potentialRuleViolations: Partial<RuleViolation>[] =
    lintResult.lintErrors.map((error) => ({
      ruleName: rule.name,
      codeSnippet: error.codeSnippet,
      codeSnippetSource: 'unknown',
      reasoning: error.reasoning
    }))

  const messages: Prompt.Msg[] = [
    Msg.system(`# INSTRUCTIONS

You are an expert senior TypeScript software engineer at Vercel who loves to lint code. You make sure source code conforms to project-specific guidelines and best practices. You will be given a RULE with a description of the RULE's intent and some positive examples where the RULE is used correctly and some negative examples where the RULE is VIOLATED (used incorrectly).

Your task is to take the given SOURCE code and an array of POTENTIAL RULE_VIOLATION objects and determine whether these rule violations actually VIOLATE the RULE's intent.

${stringifyRuleForModel(rule)}

---

# SOURCE ${file.fileName}:

${file.content}
`),

    Msg.user(`# TASK

Given the POTENTIAL RULE_VIOLATION objects from the SOURCE code ${
      file.fileName
    }, determine whether these rule violations actually VIOLATE the RULE's intent.

For any potential RULE_VIOLATION objects which VIOLATE the RULE, include them in the output and include your \`reasoning\`. For any potential RULE_VIOLATION objects which correctly conform to the RULE, then include them in the output with \`violation\` set to \`false\` and explain your \`reasoning\`.

RULE_VIOLATION schema:

${stringifyRuleViolationSchemaForModel(rule)}

POTENTIAL RULE_VIOLATION objects to check:

${stringifyRuleViolationForModel(potentialRuleViolations)}

---

Example output format:

\`\`\`json
{
  ruleViolations: [
    {
      "ruleName": "${rule.name}",
      "codeSnippet": "...",
      "codeSnippetSource": "source",
      "reasoning": "..."
      "violation": true,
      "confidence": "high",
    }
  ]
}
\`\`\`
`)
  ]

  let retries = retryOptions.retries

  do {
    let response: string

    try {
      const model = config.llmOptions.model
      const res = await chatModel.run({
        model,
        messages,
        response_format: { type: 'json_object' }
      })

      response = res.message.content!
      lintResult.message = response

      if (config.linterOptions.debug) {
        console.log(
          `\nrule "${rule.name}" file "${file.fileRelativePath}" response from model "${model}":\n\n${response}\n\n`
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

      const ruleViolationsParseResult = safeParseStructuredOutput(
        response,
        ruleViolationsValidatedOutputSchema
      )
      if (!ruleViolationsParseResult.success) {
        throw new RetryableError(
          `Invalid output: the JSON output failed to parse according to the given RULE_VIOLATION schema. Parser error: ${ruleViolationsParseResult.error}`
        )
      }

      const { ruleViolations } = ruleViolationsParseResult.data

      // Overwrite the lint errors from the first-pass with the validated rule
      // violations
      lintResult.lintErrors = []

      for (const ruleViolation of ruleViolations) {
        const {
          violation,
          confidence,
          codeSnippet,
          codeSnippetSource,
          reasoning
        } = ruleViolation

        if (
          !violation ||
          confidence !== 'high' ||
          codeSnippetSource !== 'source'
        ) {
          // Ignore any false positives
          continue
        }

        const ruleName = ruleViolation.ruleName?.toLowerCase().trim()
        if (ruleName && rule.name !== ruleName) {
          console.warn(
            `warning: rule "${rule.name}" LLM recorded error with unrecognized rule name "${ruleName}" on file "${file.fileRelativePath}"`
          )

          continue
        }

        // TODO: need a better way to determine if the violation is from the RULE's negative examples or the SOURCE

        lintResult.lintErrors.push({
          filePath: file.filePath,
          language: file.language,
          ruleName: rule.name,
          model,
          codeSnippet,
          confidence,
          reasoning
        })
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

  return lintResult
}
