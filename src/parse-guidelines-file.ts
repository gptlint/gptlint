import type { Heading } from 'mdast'
import { visit } from 'unist-util-visit'

import type * as types from './types.js'
import {
  findAllBetween,
  parseMarkdownAST,
  parseRuleNode
} from './markdown-utils.js'
import { assert } from './utils.js'

export async function parseGuidelinesFile({
  content,
  filePath
}: {
  content: string
  filePath: string
}): Promise<types.Rule[]> {
  const ast = parseMarkdownAST(content)
  const h2RuleNodes: Heading[] = []

  visit(ast, (node) => {
    if (node.type !== 'heading' || node.depth !== 2) {
      return
    }

    h2RuleNodes.push(node)
  })

  assert(
    h2RuleNodes.length > 0,
    `Guidelines file must contain at least one h2 header rule: ${filePath}`
  )

  const rules: types.Rule[] = []

  for (let i = 0; i < h2RuleNodes.length; ++i) {
    const headingRuleNode = h2RuleNodes[i]!
    const bodyRuleNodes = findAllBetween(
      ast,
      headingRuleNode,
      h2RuleNodes[i + 1]
    )

    const rule = parseRuleNode({ headingRuleNode, bodyRuleNodes, filePath })
    rules.push(rule)
  }

  return rules
}
