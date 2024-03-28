import type { Code, Heading, Node, Parent, Root, Table } from 'mdast'
import { toString } from 'mdast-util-to-string'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { inspectColor } from 'unist-util-inspect'
import { type Test, is } from 'unist-util-is'

import type * as types from './types.js'
import {
  assert,
  isValidRuleName,
  isValidRuleSetting,
  slugify
} from './utils.js'

export function parseMarkdownAST(content: string) {
  return unified().use(remarkParse).use(remarkGfm).parse(content)
}

export { inspectColor as inspectNode }

export function parseRuleNode({
  headingRuleNode,
  bodyRuleNodes,
  filePath
}: {
  headingRuleNode: Node
  bodyRuleNodes: Node[]
  filePath: string
}): types.Rule {
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

  const rule: types.Rule = {
    message,
    name: slugify(message).trim(),
    desc: toString(bodyRuleNode),
    positiveExamples: [],
    negativeExamples: [],
    source: filePath
  }
  assert(rule.name, `Rule name must not be empty: ${message}`)

  assert(
    tableRuleNodes.length <= 1,
    `Rule must not contain more than 1 markdown table: ${message} (${filePath})`
  )

  if (tableRuleNodes.length === 1) {
    const tableNode = tableRuleNodes[0]!
    parseRuleTableNode({ tableNode, rule, filePath })
  }

  assert(
    isValidRuleName(rule.name),
    `Rule name is invalid "${rule.name}": ${message}`
  )

  const exampleRuleNode: Root = {
    type: 'root',
    children: exampleRuleNodes as any
  }

  const h3Nodes = exampleRuleNodes.filter(
    (node) => node.type === 'heading' && (node as Heading).depth >= 3
  ) as Heading[]

  assert(
    h3Nodes.length <= 2,
    `Rule must not contain more than 2 H3 markdown nodes: ${rule.name} (${filePath})`
  )

  let numPositiveSections = 0
  let numNegativeSections = 0

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
      `Rule h3 header for examples section "${sectionLabel}" must include a known positive label (good, correct) or negative label (bad, incorrect): ${rule.name} (${filePath})`
    )

    const codeBlockNodes = sectionNodes.filter(
      (node) => node.type === 'code'
    ) as Code[]

    if (isPositive) {
      numPositiveSections++
    } else if (isNegative) {
      numNegativeSections++
    }

    // console.log(
    //   'sectionNode',
    //   {
    //     sectionLabel,
    //     isPositive,
    //     isNegative,
    //     numCodeBlockNodes: codeBlockNodes.length
    //   },
    //   inspectColor(
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

  assert(
    numPositiveSections <= 1,
    `Rule must not contain more than 1 positive examples section: ${rule.name} (${filePath})`
  )

  assert(
    numNegativeSections <= 1,
    `Rule must not contain more than 1 negative examples section: ${rule.name} (${filePath})`
  )

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

export function parseRuleTableNode({
  tableNode,
  rule,
  filePath
}: {
  tableNode: Table
  rule: types.Rule
  filePath: string
}) {
  const headerRow = tableNode.children[0]
  const bodyRows = tableNode.children.slice(1)

  assert(
    headerRow?.type === 'tableRow',
    `Rule contains invalid table: ${rule.message} (${filePath})`
  )
  assert(
    headerRow.children.length === 2,
    `Rule contains invalid table (must have 2 columns): ${rule.message} (${filePath})`
  )
  assert(
    toString(headerRow.children[0]).toLowerCase().trim() === 'key',
    `Rule contains invalid table (first column must be "key"): ${rule.message} (${filePath})`
  )
  assert(
    toString(headerRow.children[1]).toLowerCase().trim() === 'value',
    `Rule contains invalid table (first column must be "value"): ${rule.message} (${filePath})`
  )
  assert(
    bodyRows.length > 0,
    `Rule contains invalid table (empty table body): ${rule.message} (${filePath})`
  )

  const validRuleTableKeysL = new Set<string>([
    'name',
    'level',
    'fixable',
    'tags',
    'languages',
    'eslint'
  ])

  for (const bodyRow of bodyRows) {
    assert(
      bodyRow.children.length === 2,
      `Rule contains invalid table (body rows must have 2 columns): ${rule.message} (${filePath})`
    )

    const key = toString(bodyRow.children[0]).toLowerCase().trim()
    assert(
      validRuleTableKeysL.has(key),
      `Rule contains invalid table (unsupported key "${key}"): ${rule.message} (${filePath})`
    )

    const value = toString(bodyRow.children[1]).toLowerCase().trim()
    if (key === 'name') {
      assert(
        value,
        `Rule contains invalid table ("name" must not be empty): ${rule.message} (${filePath})`
      )

      rule.name = value
    } else if (key === 'level') {
      assert(
        isValidRuleSetting(value),
        `Rule contains invalid table ("level" must be one of "warn" | "error" | "off"): ${rule.message} (${filePath})`
      )

      rule.level = value
    } else if (key === 'fixable') {
      assert(
        value === 'true' || value === 'false',
        `Rule contains invalid table ("fixable" must be one of "true" | "false"): ${rule.message} (${filePath})`
      )

      rule.fixable = value === 'true'
    } else if (key === 'tags') {
      rule.tags = value.split(',').map((v) => v.trim())
    } else if (key === 'languages') {
      rule.languages = value.split(',').map((v) => v.trim())
    } else if (key === 'eslint') {
      rule.eslint = value.split(',').map((v) => v.trim())
    } else {
      assert(
        false,
        `Rule contains invalid table (unsupported key "${key}"): ${rule.message} (${filePath})`
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

export function findAllCodeBlockNodes(tree: Root) {
  return tree.children.filter((node) => node.type === 'code') as Code[]
}
