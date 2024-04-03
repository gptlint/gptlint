import { type ChatModel, Msg, type Prompt } from '@dexaai/dexter'
import plur from 'plur'

import type * as types from './types.js'
import { defaultLinterConfig, isValidModel } from './config.js'
import { AbortError, RetryableError } from './errors.js'
import { stringifyRuleForModel } from './rule-utils.js'
import {
  parseRuleViolationsFromJSONModelResponse,
  parseRuleViolationsFromModelResponse,
  type RuleViolation,
  stringifyExampleRuleViolationsArrayOutputForModel,
  stringifyExampleRuleViolationsObjectOutputForModel,
  stringifyRuleViolationForModel,
  stringifyRuleViolationSchemaForModel
} from './rule-violations.js'
import { createLintResult, pruneUndefined } from './utils.js'

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
  const isTwoPassLintingEnabled = isValidModel(config.llmOptions.weakModel)
  const model = isTwoPassLintingEnabled
    ? config.llmOptions.weakModel!
    : config.llmOptions.model
  let lintResult = createLintResult()

  if (config.linterOptions.debug) {
    console.log(
      `>>> Linting rule "${rule.name}" file "${file.fileRelativePath}" with model "${model}"`
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

Accuracy is important, so be sure to think step-by-step and explain your reasoning briefly in the EXPLANATION section. Do not list out all variable names or identifiers in the EXPLANATION section.

If you find any code snippets which VIOLATE the RULE, then output them as RULE_VIOLATION objects in the VIOLATIONS section. The VIOLATIONS section should be a JSON array of RULE_VIOLATION objects. This array may be empty if there are no RULE VIOLATIONS. Ignore code snippets which correctly conform to the RULE.

RULE_VIOLATION schema:

${stringifyRuleViolationSchemaForModel(rule)}

DO NOT INCLUDE THE WHOLE SOURCE code in \`codeSnippet\`. \`codeSnippet\` should be a short portion of the SOURCE and should never be longer than 10 lines of code.
MAKE SURE YOU TRUNCATE LONG CODE SNIPPETS using an ellipsis "..." so they are no longer than 10 lines of code.

---

Example markdown output format:

# EXPLANATION

Plain text explanation of the SOURCE and reasoning for any potential VIOLATIONS.

# VIOLATIONS

${stringifyExampleRuleViolationsArrayOutputForModel(rule)}
`)
  ]

  let retries = retryOptions.retries

  do {
    try {
      const res = await chatModel.run({
        model,
        messages
      })

      const response = res.message.content!
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
        if (config.linterOptions.debug) {
          console.error(
            `Unexpected error processing rule "${rule.name}" file "${file.fileRelativePath}":`,
            err
          )
        }

        throw new TypeError(
          `Unexpected error processing rule "${rule.name}" file "${file.fileRelativePath}": ${err.message}`,
          { cause: err }
        )
      }
    }
  } while (true)

  if (lintResult.lintErrors.length > 0 && isTwoPassLintingEnabled) {
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

/**
 * If two-pass linting is enabled, then this function is called after the first
 * pass to validate the potential rule violations from the first pass using a
 * smarter model.
 *
 * This pass is aimed at reducing false positives.
 */
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
  const model = config.llmOptions.model

  // Determine if the model supports JSON response format, which is preferred,
  // or fallback to the default behavior of parsing JSON in a markdown code block
  // from the model's text response.
  // TODO: supporting both JSON output and markdown output here isn't ideal, but
  // for OpenAI models, the JSON output is much more reliable so we'd like to
  // take advantage of that if possible. For compatibility with other LLMs,
  // however, we need to support the non-JSON-mode output as well which makes
  // the implementation harder to debug, evaluate, and maintain.
  const modelSupportsJsonResponseFormat =
    config.llmOptions.modelSupportsJsonResponseFormat ??
    (config.llmOptions.apiBaseUrl === defaultLinterConfig.llmOptions.apiBaseUrl!
      ? true
      : false)

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

DO NOT INCLUDE THE WHOLE SOURCE code in \`codeSnippet\`. \`codeSnippet\` should be a short portion of the SOURCE and should never be longer than 10 lines of code.
MAKE SURE YOU TRUNCATE LONG CODE SNIPPETS using an ellipsis "..." so they are no longer than 10 lines of code.

---

POTENTIAL RULE_VIOLATION objects to check:

${stringifyRuleViolationForModel(potentialRuleViolations)}

---

Example ${modelSupportsJsonResponseFormat ? 'JSON' : 'markdown'} output format:

${
  modelSupportsJsonResponseFormat
    ? stringifyExampleRuleViolationsObjectOutputForModel(rule)
    : `# VIOLATIONS

${stringifyExampleRuleViolationsArrayOutputForModel(rule)}`
}
`)
  ]

  let retries = retryOptions.retries

  do {
    try {
      const res = await chatModel.run(
        pruneUndefined({
          model,
          messages,
          response_format: modelSupportsJsonResponseFormat
            ? { type: 'json_object' }
            : undefined
        })
      )

      const response = res.message.content!
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

      const ruleViolations = modelSupportsJsonResponseFormat
        ? parseRuleViolationsFromJSONModelResponse(response)
        : parseRuleViolationsFromModelResponse(response, {
            numExpectedMarkdownHeadings: 1
          })

      // Overwrite lint errors from the first-pass with the validated violations
      // NOTE: This should appear after we've successfully validated the model's
      // response, so we don't prematurely overwrite the original lint errors.
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
        if (config.linterOptions.debug) {
          console.error(
            `Unexpected error processing rule "${rule.name}" file "${file.fileRelativePath}":`,
            err
          )
        }

        throw new TypeError(
          `Unexpected error processing rule "${rule.name}" file "${file.fileRelativePath}": ${err.message}`,
          { cause: err }
        )
      }
    }
  } while (true)

  return lintResult
}
