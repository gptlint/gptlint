import fs from 'node:fs/promises'
import path from 'node:path'

import { parseDocument as parseYAMLDocument } from 'yaml'

import type * as types from './types.js'
import {
  convertASTToPlaintext,
  findAllBetween,
  findAllCodeBlockNodes,
  findAllHeadingNodes,
  findAllYAMLNodes,
  parseMarkdownAST,
  parseRuleNode
} from './markdown-utils.js'
import { RuleDefinitionSchema } from './rule.js'
import { validateRule } from './rule-utils.js'
import { assert, omit } from './utils.js'

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

  const yamlNodes = findAllYAMLNodes(ast)
  assert(
    h1RuleNodes.length <= 1,
    `Rule must not contain more than 1 yaml frontmatter nodes: ${filePath}`
  )

  const maybePartialRule =
    yamlNodes.length === 1
      ? parseRuleFrontmatter(yamlNodes[0]?.value)
      : undefined

  const headingRuleNode = h1RuleNodes[0]!
  let bodyRuleNodes = findAllBetween(ast, headingRuleNode)
  const gritCodeBlockNodes = findAllCodeBlockNodes(ast).filter(
    (codeNode) => codeNode.lang === 'grit' || codeNode.lang === 'gritql'
  )
  assert(
    gritCodeBlockNodes.length <= 1,
    `Rule must not contain more than 1 "grit" code blocks: ${filePath}`
  )

  const codeBlockNode = gritCodeBlockNodes[0]
  let gritql: string | undefined
  if (codeBlockNode) {
    gritql = convertASTToPlaintext(codeBlockNode)?.trim()
    bodyRuleNodes = bodyRuleNodes.filter((node) => node !== codeBlockNode)
  }

  const rule = parseRuleNode({
    headingRuleNode,
    bodyRuleNodes,
    filePath,
    partialRule: {
      ...maybePartialRule,
      gritql
    }
  })

  return validateRule(rule)
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

export function parseRuleFrontmatter(
  yaml: string | undefined
): Partial<types.RuleDefinition> | undefined {
  if (!yaml) {
    return
  }

  try {
    // TODO: more friendly error messages
    // TODO: relax string[] to handle single strings
    const yamlData: Record<string, unknown> = parseYAMLDocument(yaml).toJSON()

    const parsedRule = RuleDefinitionSchema.strict().safeParse({
      name: 'dummy-rule-title',
      title: 'dummy rule title',
      ...yamlData
    })

    if (!parsedRule.success) {
      throw new Error(
        `Rule contains invalid frontmatter metadata: ${parsedRule.error}`
      )
    }

    const rule = parsedRule.data
    return omit(rule, 'name', 'title')
  } catch (err: any) {
    throw new Error(`Error parsing rule frontmatter: ${err.message}`, {
      cause: err
    })
  }
}
