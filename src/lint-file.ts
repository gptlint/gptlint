import { Msg, type Prompt } from '@dexaai/dexter'
import plur from 'plur'

import type * as types from './types.js'
import { defaultLinterConfig, isValidModel } from './config.js'
import {
  AbortError,
  type FailedAttemptError,
  RetryableError
} from './errors.js'
import { preProcessFileWithGrit } from './gritql.js'
import { createLintResult, dedupeLintErrors } from './lint-result.js'
import { stringifyRuleForModel } from './rule-utils.js'
import {
  isRuleViolationLikelyFalsePositive,
  parseRuleViolationsFromJSONModelResponse,
  parseRuleViolationsFromMarkdownModelResponse,
  type RuleViolation,
  stringifyExampleRuleViolationsArrayOutputForModel,
  stringifyExampleRuleViolationsObjectOutputForModel,
  stringifyRuleViolationForModel,
  stringifyRuleViolationSchemaForModel
} from './rule-violations.js'
import { pruneUndefined, trimMessage } from './utils.js'

// TODO: Improve the duplication between `lintFile` and `validateRuleViolations`
// for two-pass linting.

/**
 * Core linting logic which takes in a single `rule` and a single `file` and
 * uses the `chatModel` LLM to extract rule violations using structured output.
 */
export async function lintFile({
  file,
  rule,
  lintResult,
  chatModel,
  cache,
  config,
  cwd,
  retryOptions = {
    retries: 2
  },
  enableGrit = false
}: types.RuleProcessFileFnParams & {
  enableGrit?: boolean
}): Promise<types.LintResult> {
  lintResult = createLintResult(lintResult)

  // Used to create a demo video with a mocked linting process to have precise
  // control over the timing and reproducibility of the output.
  // eslint-disable-next-line no-process-env
  // if (!process.env.NO_DEMO) {
  //   const timeout = Math.trunc(250 + Math.random() * 1500)
  //   return new Promise<types.LintResult>((resolve) =>
  //     setTimeout(() => {
  //       const p = Math.trunc(800 + Math.random() * 1000)
  //       const r = Math.trunc(200 + Math.random() * 300)
  //       lintResult!.numPromptTokens += p
  //       lintResult!.numCompletionTokens += r
  //       lintResult!.numTotalTokens += p + r
  //       lintResult!.totalCost += 0.0001 * (p + r)
  //       resolve(lintResult!)
  //     }, timeout)
  //   )
  // }

  const isTwoPassLintingEnabled = isValidModel(config.llmOptions.weakModel)
  const model =
    rule.model ?? isTwoPassLintingEnabled
      ? config.llmOptions.weakModel!
      : config.llmOptions.model

  // This path is only used for running evals with grit enabled, since the evals
  // don't call `lintFiles` but rather `lintFile` directly.
  if (enableGrit && rule.gritql) {
    const ruleNameToPartialSourceFileMap = new Map<
      string,
      Promise<Map<string, types.PartialSourceFile>>
    >()

    const maybeLintResult = await preProcessFileWithGrit({
      file,
      rule,
      config,
      ruleNameToPartialSourceFileMap
    })

    if (maybeLintResult) {
      return maybeLintResult
    }
  }

  if (config.linterOptions.debug) {
    console.log(
      `>>> Linting rule "${rule.name}" file "${file.fileRelativePath}" with model "${model}"`
    )
  }

  const messages: Prompt.Msg[] = [
    Msg.system(`<INSTRUCTIONS>

You are an expert senior TypeScript software engineer at Vercel who loves to lint code. You make sure source code conforms to project-specific guidelines and best practices. You will be given a RULE with a description of the RULE's intent and some positive examples where the RULE is used correctly and some negative examples where the RULE is VIOLATED (used incorrectly).

Your task is to take the given SOURCE code and determine whether any portions of it VIOLATE the RULE's intent.

</INSTRUCTIONS>

---

${stringifyRuleForModel(rule)}

---

<SOURCE ${file.fileName}>

${file.partialContent || file.content}

</SOURCE ${file.fileName}> 
`),

    Msg.user(`Your job is to identify any portions of the SOURCE ${
      file.fileName
    } which are related to the RULE ${rule.name} and explain whether they VIOLATE or conform to the RULE's intent. Your answer should contain two markdown sections, EXPLANATION and VIOLATIONS.

Accuracy is important, so be sure to think step-by-step and explain your reasoning briefly in the EXPLANATION section. Do not list out all variable names or identifiers in the EXPLANATION section, but rather focus on listing out the most relevant portions of the SOURCE that the given RULE may apply to.

If you find any code snippets which VIOLATE the RULE, then output them as RULE_VIOLATION objects in the VIOLATIONS section. The VIOLATIONS section should be a JSON array of RULE_VIOLATION objects. This array may be empty if there are no RULE VIOLATIONS. Ignore code snippets which correctly conform to the RULE.

---

<RULE_VIOLATION schema>

${stringifyRuleViolationSchemaForModel(rule, file)}

</RULE_VIOLATION schema>

---

Example markdown output format:

# EXPLANATION

Plain text explanation of any areas of the SOURCE code which may be affected by the RULE and brief reasoning for any potential VIOLATIONS.

# VIOLATIONS

${stringifyExampleRuleViolationsArrayOutputForModel(rule)}
`)
  ]

  let retries = retryOptions.retries

  do {
    try {
      // Useful for testing fake errors
      // if (rule.name === 'use-esm') {
      //   throw new RetryableError('example error for testing')
      // } else if (rule.name === 'semantic-variable-names') {
      //   lintResult.lintErrors.push({
      //     message: rule.title,
      //     filePath: file.fileRelativePath,
      //     language: file.language,
      //     model,
      //     ruleName: rule.name,
      //     codeSnippet: 'const TODO = 1',
      //     confidence: 'high',
      //     reasoning: 'EXAMPLE',
      //     level: 'error'
      //   })
      //   return lintResult
      // }

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

      const ruleViolations =
        parseRuleViolationsFromMarkdownModelResponse(response)

      for (const ruleViolation of ruleViolations) {
        if (isRuleViolationLikelyFalsePositive({ ruleViolation, rule, file })) {
          // Ignore any false positives
          continue
        }

        const { confidence, codeSnippet, reasoning } = ruleViolation

        lintResult.lintErrors.push({
          message: rule.title,
          filePath: file.filePath,
          language: file.language,
          ruleName: rule.name,
          level: rule.level,
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

        if (retryOptions?.onFailedAttempt) {
          if (retryOptions?.onFailedAttempt) {
            ;(err as any).attemptNumber = Math.max(
              0,
              retryOptions.retries - retries - 1
            )
            ;(err as any).retriesLeft = retries

            await Promise.resolve(
              retryOptions.onFailedAttempt(err as FailedAttemptError)
            )
          }
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
            trimMessage(err.message, { maxLength: 400 })
          )
        }

        throw new TypeError(
          `Unexpected error processing rule "${rule.name}" file "${file.fileRelativePath}": ${trimMessage(err.message)}`,
          { cause: err }
        )
      }
    }
  } while (true)

  lintResult.lintErrors = dedupeLintErrors(lintResult.lintErrors)

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
      cache,
      config,
      retryOptions,
      cwd
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
}: types.RulePostProcessFileFnParams): Promise<types.LintResult> {
  const model = rule.model ?? config.llmOptions.model
  lintResult = createLintResult(lintResult)

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
    ((config.llmOptions.apiBaseUrl ===
      defaultLinterConfig.llmOptions.apiBaseUrl! &&
      model !== 'gpt-4') ||
      config.llmOptions.apiBaseUrl === 'https://api.groq.com/openai/v1')

  const potentialRuleViolations: Partial<RuleViolation>[] =
    lintResult.lintErrors.map((error) => ({
      ruleName: rule.name,
      codeSnippet: error.codeSnippet,
      codeSnippetSource: 'unknown'
      // We intentionally omit the weak model's `reasoning` here because it may
      // be misleading, and that's what we're relying on the strong model for.
    }))

  const messages: Prompt.Msg[] = [
    Msg.system(`<INSTRUCTIONS>

You are an expert senior TypeScript software engineer at Vercel who loves to lint code. You make sure source code conforms to project-specific guidelines and best practices. You will be given a RULE with a description of the RULE's intent and some positive examples where the RULE is used correctly and some negative examples where the RULE is VIOLATED (used incorrectly).

Your task is to take the given SOURCE code and an array of POTENTIAL RULE_VIOLATION objects and determine whether these rule violations actually VIOLATE the RULE's intent.

</INSTRUCTIONS>

---

${stringifyRuleForModel(rule)}

---

<SOURCE ${file.fileName}>

${file.partialContent || file.content}

</SOURCE ${file.fileName}> 
`),

    Msg.user(`Given the POTENTIAL RULE_VIOLATION objects from the SOURCE code ${
      file.fileName
    }, determine whether these rule violations actually VIOLATE the RULE's intent.

For any potential RULE_VIOLATION objects which VIOLATE the RULE, include them in the output with \`violation\` set to \`true\` and explain your \`reasoning\`. For any potential RULE_VIOLATION objects which correctly conform to the RULE, then include them in the output with \`violation\` set to \`false\` and explain your \`reasoning\`.

---

<RULE_VIOLATION schema>

${stringifyRuleViolationSchemaForModel(rule, file)}

</RULE_VIOLATION schema>

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
        : parseRuleViolationsFromMarkdownModelResponse(response, {
            numExpectedMarkdownHeadings: 1
          })

      // Overwrite lint errors from the first-pass with the validated violations
      // NOTE: This should appear after we've successfully validated the model's
      // response, so we don't prematurely overwrite the original lint errors.
      lintResult.lintErrors = []

      for (const ruleViolation of ruleViolations) {
        if (isRuleViolationLikelyFalsePositive({ ruleViolation, rule, file })) {
          // Ignore any false positives
          continue
        }

        const { confidence, codeSnippet, reasoning } = ruleViolation

        lintResult.lintErrors.push({
          message: rule.title,
          filePath: file.filePath,
          language: file.language,
          ruleName: rule.name,
          level: rule.level,
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

        if (retryOptions?.onFailedAttempt) {
          ;(err as any).attemptNumber = Math.max(
            0,
            retryOptions.retries - retries - 1
          )
          ;(err as any).retriesLeft = retries

          await Promise.resolve(
            retryOptions.onFailedAttempt(err as FailedAttemptError)
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
            trimMessage(err.message, { maxLength: 400 })
          )
        }

        throw new TypeError(
          `Unexpected error processing rule "${rule.name}" file "${file.fileRelativePath}": ${trimMessage(err.message)}`,
          { cause: err }
        )
      }
    }
  } while (true)

  lintResult.lintErrors = dedupeLintErrors(lintResult.lintErrors)
  return lintResult
}
