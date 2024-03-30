import type { Code } from 'mdast'
import { toString } from 'mdast-util-to-string'

import { RetryableError } from './errors.js'
import {
  findAllBetween,
  findAllCodeBlockNodes,
  findAllHeadingNodes,
  parseMarkdownAST
} from './markdown-utils.js'
import { safeParseStructuredOutput } from './parse-structured-output.js'
import {
  type RuleViolation,
  ruleViolationsOutputSchema
} from './rule-violations.js'

export function parseRuleViolationsFromModelResponse(
  response: string
): RuleViolation[] {
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
