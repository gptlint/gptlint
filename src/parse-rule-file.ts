import type { Heading } from 'mdast'
import { visit } from 'unist-util-visit'

import type * as types from './types.js'
import {
  findAllBetween,
  parseMarkdownAST,
  parseRuleNode
} from './markdown-utils.js'
import { assert } from './utils.js'

export async function parseRuleFile({
  content,
  filePath
}: {
  content: string
  filePath: string
}): Promise<types.Rule> {
  const ast = parseMarkdownAST(content)
  const h1RuleNodes: Heading[] = []

  visit(ast, (node) => {
    if (node.type !== 'heading' || node.depth !== 1) {
      return
    }

    h1RuleNodes.push(node)
  })

  assert(
    h1RuleNodes.length === 1,
    `Rule file must contain a single h1 header: ${filePath}`
  )

  const headingRuleNode = h1RuleNodes[0]!
  const bodyRuleNodes = findAllBetween(ast, headingRuleNode)

  const rule = parseRuleNode({ headingRuleNode, bodyRuleNodes, filePath })
  return rule
}
