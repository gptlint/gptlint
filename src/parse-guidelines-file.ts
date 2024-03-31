import type * as types from './types.js'
import {
  findAllBetween,
  findAllHeadingNodes,
  parseMarkdownAST,
  parseRuleNode
} from './markdown-utils.js'
import { assert } from './utils.js'

/**
 * Parses a guidelines definition markdown file containing an array of one or
 * more rules and returns the result.
 */
export async function parseGuidelinesFile({
  content,
  filePath
}: {
  content: string
  filePath: string
}): Promise<types.Rule[]> {
  const ast = parseMarkdownAST(content)
  const h2RuleNodes = findAllHeadingNodes(ast, { depth: 2 })

  assert(
    h2RuleNodes.length > 0,
    `Guidelines file must contain at least one h2 header rule: ${filePath}`
  )

  const rules: types.Rule[] = []
  const ruleNames = new Set<string>()

  for (let i = 0; i < h2RuleNodes.length; ++i) {
    const headingRuleNode = h2RuleNodes[i]!
    const bodyRuleNodes = findAllBetween(
      ast,
      headingRuleNode,
      h2RuleNodes[i + 1]
    )

    const rule = parseRuleNode({ headingRuleNode, bodyRuleNodes, filePath })

    assert(
      !ruleNames.has(rule.name),
      `Guidelines file has duplicate rule "${rule.name}": ${filePath}`
    )

    ruleNames.add(rule.name)
    rules.push(rule)
  }

  return rules
}
