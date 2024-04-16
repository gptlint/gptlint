import type { Code } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { z } from 'zod'

import type * as types from './types.js'
import { RetryableError } from './errors.js'
import {
  findAllBetween,
  findAllCodeBlockNodes,
  findAllHeadingNodes,
  parseMarkdownAST
} from './markdown-utils.js'
import { safeParseStructuredOutput } from './parse-structured-output.js'

/**
 * The core zod schema which is used to parse the LLM's structured output.
 *
 * Note that the order of the keys is empirically important to help the LLM
 * "think" in the right order.
 *
 * Note that `codeSnippetSource`, `reasoning`, `violation`, and `confidence`
 * were all added empirically to increase the LLM's accuracy and to mitigate
 * common forms of false positives.
 */
export const ruleViolationSchema = z.object({
  ruleName: z
    .string()
    .optional()
    .describe('The name of the RULE which this `codeSnippet` violates.'),

  codeSnippet: z
    .string()
    .describe(
      'The offending code snippet which fails to conform to the given RULE. CODE SNIPPETS MUST BE SHORT and should include an ellipsis "..." if they would be more than 10 lines of code.'
    ),

  codeSnippetSource: z
    .enum(['examples', 'source', 'unknown'])
    .optional()
    .describe(
      'Where this rule violation\'s `codeSnippet` comes from. If it comes from the RULE examples, then use "examples". If it comes from the SOURCE, then use "source".'
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
export type RuleViolation = z.infer<typeof ruleViolationSchema>

export const ruleViolationsOutputSchema = z.array(ruleViolationSchema)
export type RuleViolationsOutput = z.infer<typeof ruleViolationsOutputSchema>

export const ruleViolationsValidatedOutputSchema = z.object({
  ruleViolations: ruleViolationsOutputSchema
})
export type RuleViolationsValidatedOutput = z.infer<
  typeof ruleViolationsValidatedOutputSchema
>

export function parseRuleViolationsFromJSONModelResponse(
  response: string
): RuleViolation[] {
  const ruleViolationsParseResult = safeParseStructuredOutput(
    response,
    ruleViolationsValidatedOutputSchema
  )
  if (!ruleViolationsParseResult.success) {
    throw new RetryableError(
      `Invalid output: the JSON output failed to parse according to the given RULE_VIOLATION schema. Parser error: ${ruleViolationsParseResult.error}`
    )
  }

  return ruleViolationsParseResult.data.ruleViolations
}

/**
 * Attempts to parse an array of `RuleViolation` objects from a JSON code block
 * in the given markdown response.
 *
 * Will throw a `RetryableError` if the response is invalid with an error
 * message that the LLM can use to retry the request.
 */
export function parseRuleViolationsFromMarkdownModelResponse(
  response: string,
  {
    numExpectedMarkdownHeadings = 2
  }: {
    numExpectedMarkdownHeadings?: number
  } = {}
): RuleViolation[] {
  const ast = parseMarkdownAST(response)
  const codeBlocksNodes = findAllCodeBlockNodes(ast)
  let codeBlockNode: Code | undefined

  if (codeBlocksNodes.length === 0) {
    const h1Nodes = findAllHeadingNodes(ast, { depth: 1 })

    if (h1Nodes.length >= numExpectedMarkdownHeadings) {
      // The output is formatted properly, but there are no rule violations.
      return []
    }

    throw new RetryableError(
      'Invalid output: missing VIOLATIONS code block which should contain an array of RULE_VIOLATION objects.'
    )
  } else if (codeBlocksNodes.length > 1) {
    const h1Nodes = findAllHeadingNodes(ast, { depth: 1 })

    if (h1Nodes.length === 0) {
      throw new RetryableError('Invalid output: missing VIOLATIONS header.')
    } else {
      const headers = h1Nodes.map((node) => toString(node).toLowerCase().trim())
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
        const jsonViolationCodeBlockNodes = violationsCodeBlocksNodes.filter(
          (node) => node.lang === 'json'
        )

        if (jsonViolationCodeBlockNodes.length === 0) {
          const parseableCodeBlockNodes = violationsCodeBlocksNodes.filter(
            (node) =>
              safeParseStructuredOutput(node.value, ruleViolationsOutputSchema)
                .success
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
  }

  const ruleViolations = parsedRuleViolationsResult.data
  return ruleViolations
}

export function stringifyRuleViolationSchemaForModel(
  rule: types.Rule,
  file: types.SourceFile
): string {
  // TODO: Ideally, we would generate this from the zod schema to ensure a
  // single source of truth, but this was easier for now and doesn't involve
  // adding any larger dependencies.
  return `\`\`\`ts
interface RULE_VIOLATION {
  // The name of the RULE which this \`codeSnippet\` violates.
  ruleName: string

  // The offending code snippet which fails to conform to the given RULE. CODE SNIPPETS MUST BE SHORT and should include an ellipsis "..." if they would be more than 10 lines of code.
  codeSnippet: string

  // Where this rule violation's \`codeSnippet\` comes from. If it comes from the RULE ${rule.name} examples, then use "examples". If it comes from the SOURCE code "${file.fileRelativePath}", then use "source".
  codeSnippetSource: "examples" | "source"

  // An explanation of why this code snippet VIOLATES the RULE. Think step-by-step when describing your reasoning.
  reasoning: string

  // Whether or not this \`codeSnippet\` violates the RULE. If this \`codeSnippet\` does VIOLATE the RULE, then \`violation\` should be \`true\`. If the \`codeSnippet\` conforms to the RULE correctly or does not appear in the SOURCE, then \`violation\` should be \`false\`.
  violation: boolean

  // Your confidence that the \`codeSnippet\` VIOLATES the RULE.
  confidence: "low" | "medium" | "high"
}
\`\`\``
}

export function stringifyExampleRuleViolationsObjectOutputForModel(
  rule: types.Rule
): string {
  return `\`\`\`json
{
  "ruleViolations": [
    {
      "ruleName": "${rule.name}",
      "codeSnippet": "...",
      "codeSnippetSource": "source",
      "reasoning": "..."
      "violation": true,
      "confidence": "high"
    }
  ]
}
\`\`\``
}

export function stringifyExampleRuleViolationsArrayOutputForModel(
  rule: types.Rule
): string {
  return `\`\`\`json
[
  {
    "ruleName": "${rule.name}",
    "codeSnippet": "...",
    "codeSnippetSource": "source",
    "reasoning": "..."
    "violation": true,
    "confidence": "high"
  }
]
\`\`\``
}

export function stringifyRuleViolationForModel(
  ruleViolations: Partial<RuleViolation>[]
): string {
  return `\`\`\`json
{
  ruleViolations: ${JSON.stringify(ruleViolations, null, 2)}
}`
}
