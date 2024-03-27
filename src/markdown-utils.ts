import type { Code, Heading, Node, Parent, Root, Table } from 'mdast'
import { toString } from 'mdast-util-to-string'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { inspectColor } from 'unist-util-inspect'
import { type Test, is } from 'unist-util-is'

import type * as types from './types.js'
import { assert, slugify } from './utils.js'

export function parseMarkdownAST(content: string) {
  return unified().use(remarkParse).use(remarkGfm).parse(content)
}

export const inspectNode = inspectColor

export function parseRuleNode(
  headingRuleNode: Node,
  bodyRuleNodes: Node[]
): types.Rule {
  const tableRuleNodes = bodyRuleNodes.filter(
    (ruleNode) => ruleNode.type === 'table'
  ) as Table[]

  bodyRuleNodes = bodyRuleNodes.filter((node) => node.type !== 'table')

  const firstNonBodyRuleNodeIndex = bodyRuleNodes.findIndex(
    (node) => node.type === 'heading' || node.type === 'code'
  )

  let exampleRuleNodes: Node[] = []

  if (firstNonBodyRuleNodeIndex >= 0) {
    exampleRuleNodes = bodyRuleNodes.slice(firstNonBodyRuleNodeIndex)
    bodyRuleNodes = bodyRuleNodes.slice(0, firstNonBodyRuleNodeIndex)
  }

  const bodyRuleNode: Root = {
    type: 'root',
    children: bodyRuleNodes as any
  }

  const message = toString(headingRuleNode)
  assert(message, 'Rule message must not be empty')

  const name = slugify(message).trim()
  assert(name, `Rule name must not be empty: ${message}`)

  const desc = toString(bodyRuleNode)

  const rule: types.Rule = {
    name,
    message,
    desc,
    positiveExamples: [],
    negativeExamples: []
  }

  assert(
    tableRuleNodes.length <= 1,
    `Rule must not contain more than 1 markdown table: ${message}`
  )

  if (tableRuleNodes.length === 1) {
    const tableNode = tableRuleNodes[0]!
    parseRuleTableNode(tableNode, rule)
  }

  const exampleRuleNode: Root = {
    type: 'root',
    children: exampleRuleNodes as any
  }

  const h3Nodes = exampleRuleNodes.filter(
    (node) => node.type === 'heading' && (node as Heading).depth >= 3
  ) as Heading[]

  assert(
    h3Nodes.length <= 2,
    `Rule must not contain more than 2 H3 markdown nodes: ${rule.name}`
  )

  for (let i = 0; i < h3Nodes.length; ++i) {
    const h3Node = h3Nodes[i]!
    const sectionNodes = findAllBetween(exampleRuleNode, h3Node, h3Nodes[i + 1])

    const sectionLabel = toString(h3Node).toLowerCase().trim()
    const isPositive =
      /\bgood\b/i.test(sectionLabel) || /\bcorrect\b/.test(sectionLabel)
    const isNegative =
      /\bbad\b/i.test(sectionLabel) || /\bincorrect\b/.test(sectionLabel)

    assert(
      isPositive || isNegative,
      `Rule h3 header for examples section "${sectionLabel}" must include a known positive label (good, correct) or negative label (bad, incorrect): ${rule.name}`
    )

    const codeBlockNodes = sectionNodes.filter(
      (node) => node.type === 'code'
    ) as Code[]

    // console.log(
    //   'sectionNode',
    //   {
    //     sectionLabel,
    //     isPositive,
    //     isNegative,
    //     numCodeBlockNodes: codeBlockNodes.length
    //   },
    //   inspectNode(
    //     { type: 'root', children: sectionNodes },
    //     { showPositions: false }
    //   )
    // )

    for (const codeBlockNode of codeBlockNodes) {
      const code = toString(codeBlockNode)
      const language = codeBlockNode.lang ? codeBlockNode.lang : undefined

      if (isPositive) {
        rule.positiveExamples!.push({ code, language })
      } else if (isNegative) {
        rule.negativeExamples!.push({ code, language })
      }
    }
  }

  // console.log(
  //   'bodyRuleNode',
  //   inspectColor(bodyRuleNode, { showPositions: false })
  // )
  // console.log(
  //   'exampleRuleNode',
  //   inspectColor(exampleRuleNode, { showPositions: false })
  // )
  // console.log()

  return rule
}

export function parseRuleTableNode(tableNode: Table, rule: types.Rule) {
  const headerRow = tableNode.children[0]
  const bodyRows = tableNode.children.slice(1)

  assert(
    headerRow?.type === 'tableRow',
    `Rule contains invalid table: ${rule.message}`
  )
  assert(
    headerRow.children.length === 2,
    `Rule contains invalid table (must have 2 columns): ${rule.message}`
  )
  assert(
    toString(headerRow.children[0]).toLowerCase().trim() === 'key',
    `Rule contains invalid table (first column must be "key"): ${rule.message}`
  )
  assert(
    toString(headerRow.children[1]).toLowerCase().trim() === 'value',
    `Rule contains invalid table (first column must be "value"): ${rule.message}`
  )
  assert(
    bodyRows.length > 0,
    `Rule contains invalid table (empty table body): ${rule.message}`
  )

  const validRuleTableKeysL = new Set<string>([
    'name',
    'level',
    'fixable',
    'tags',
    'languages'
  ])

  for (const bodyRow of bodyRows) {
    assert(
      bodyRow.children.length === 2,
      `Rule contains invalid table (body rows must have 2 columns): ${rule.message}`
    )

    const key = toString(bodyRow.children[0]).toLowerCase().trim()
    assert(
      validRuleTableKeysL.has(key),
      `Rule contains invalid table (unsupported key "${key}"): ${rule.message}`
    )

    const value = toString(bodyRow.children[1]).toLowerCase().trim()
    if (key === 'name') {
      assert(
        value,
        `Rule contains invalid table ("name" must not be empty): ${rule.message}`
      )

      rule.name = value
    } else if (key === 'level') {
      assert(
        value === 'warn' || value === 'error' || value === 'off',
        `Rule contains invalid table ("level" must be one of "warn" | "error" | "off"): ${rule.message}`
      )

      rule.level = value
    } else if (key === 'fixable') {
      assert(
        value === 'true' || value === 'false',
        `Rule contains invalid table ("fixable" must be one of "true" | "false"): ${rule.message}`
      )

      rule.fixable = value === 'true'
    } else if (key === 'tags') {
      rule.tags = value.split(',').map((v) => v.trim())
    } else if (key === 'languages') {
      rule.languages = value.split(',').map((v) => v.trim())
    } else {
      assert(
        false,
        `Rule contains invalid table (unsupported key "${key}"): ${rule.message}`
      )
    }
  }
}

/**
 * A unist utility to get all children of a parent between two nodes or indices.
 *
 * This differs from the official `unist-util-find-all-between` to behave more like
 * `Array.slice` so if we don't specify the `end` parameter, it will default to
 * returning all nodes up until the end of the parent's children.
 *
 * @param parent Parent node to search in
 * @param start A node or index to start from (exclusive)
 * @param end A node or index to end with (exclusive)
 * @param test A test passed to unist-util-is for nodes to pass to be returns in result
 */
export function findAllBetween(
  parent: Parent,
  start: Node | number,
  end?: Node | number,
  test?: Test
): Node[] {
  if (!parent || !parent.type || !parent.children) {
    throw new Error('Expected parent node')
  }

  const { children } = parent
  const results: Node[] = []
  const startIndex = check(start)
  const endIndex = check(end)
  let child: Node
  let index = startIndex

  while (++index < endIndex) {
    child = children[index] as Node

    if (is(child, test, index, parent)) {
      results.push(child)
    }
  }

  // console.log('findAllBetween', { startIndex, endIndex, results })
  return results

  function check(indexOrNode: Node | number | undefined) {
    let index: number = 0

    if (indexOrNode === undefined) {
      return children.length
    } else if (typeof indexOrNode === 'number') {
      index = indexOrNode

      if (index < 0) {
        index = children.length
      }
    } else if ((indexOrNode as any).type) {
      index = parent.children.indexOf(indexOrNode as any)
    }

    if (isNaN(index) || index < 0 || index === Infinity) {
      throw new Error('Expected positive finite index or child node')
    }

    if (index > children.length) {
      index = children.length
    }

    return index
  }
}
