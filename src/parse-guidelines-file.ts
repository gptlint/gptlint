import type { Heading } from 'mdast'
import { visit } from 'unist-util-visit'

import type * as types from './types.js'
import {
  findAllBetween,
  parseMarkdownAST,
  parseRuleNode
} from './markdown-utils.js'

export async function parseGuidelinesFile(
  content: string
): Promise<types.Rule[]> {
  const ast = parseMarkdownAST(content)
  const h2Rules: Heading[] = []

  visit(ast, (node) => {
    if (node.type !== 'heading' || node.depth !== 2) {
      return
    }

    h2Rules.push(node)
  })

  if (!h2Rules.length) {
    throw new Error('Your guidelines file must include at least one rule.')
  }

  const rules: types.Rule[] = []

  // console.log('h2Rules', JSON.stringify(h2Rules, null, 2))

  for (let i = 0; i < h2Rules.length; ++i) {
    const headingRuleNode = h2Rules[i]!
    const bodyRuleNodes = findAllBetween(ast, headingRuleNode, h2Rules[i + 1])

    const rule = parseRuleNode(headingRuleNode, bodyRuleNodes)
    rules.push(rule)
  }

  return rules
}
