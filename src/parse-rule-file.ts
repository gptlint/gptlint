import fs from 'node:fs/promises'
import path from 'node:path'

import type * as types from './types.js'
import {
  findAllBetween,
  findAllHeadingNodes,
  parseMarkdownAST,
  parseRuleNode
} from './markdown-utils.js'
import { assert } from './utils.js'

/**
 * Parses a rule definition markdown file and returns the result.
 */
export async function parseRuleFile({
  content,
  filePath
}: {
  content: string
  filePath: string
}): Promise<types.Rule> {
  const ast = parseMarkdownAST(content)
  const h1RuleNodes = findAllHeadingNodes(ast, { depth: 1 })

  assert(
    h1RuleNodes.length === 1,
    `Rule file must contain a single h1 header: ${filePath}`
  )

  const headingRuleNode = h1RuleNodes[0]!
  const bodyRuleNodes = findAllBetween(ast, headingRuleNode)

  const rule = parseRuleNode({ headingRuleNode, bodyRuleNodes, filePath })
  return rule
}

export async function parseRuleFilePath(
  filePath: string,
  {
    cwd = process.cwd()
  }: {
    cwd?: string
  } = {}
): Promise<types.Rule> {
  const filePathResolved = cwd ? path.resolve(cwd, filePath) : filePath
  const content = await fs.readFile(filePathResolved, { encoding: 'utf8' })

  return parseRuleFile({
    content,
    filePath
  })
}
