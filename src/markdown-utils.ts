import path from 'node:path'

import type { Code, Heading, Node, Nodes, Parent, Root, Yaml } from 'mdast'
import { gfmToMarkdown } from 'mdast-util-gfm'
import { toMarkdown } from 'mdast-util-to-markdown'
import { toString } from 'mdast-util-to-string'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { is, type Test } from 'unist-util-is'

import type * as types from './types.js'
import { isValidRuleName } from './rule-utils.js'
import { assert, pruneUndefined, slugify } from './utils.js'

export function parseMarkdownAST(content: string) {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .parse(content)
}

export { inspectColor as inspectNode } from 'unist-util-inspect'

export function convertASTToMarkdown(nodes: Nodes) {
  return toMarkdown(nodes, {
    bullet: '-',
    rule: '-',
    extensions: [gfmToMarkdown()]
  })
}

export function convertASTToPlaintext(node?: Node) {
  return toString(node)
}

export function parseRuleNode({
  headingRuleNode,
  bodyRuleNodes,
  filePath,
  partialRule
}: {
  headingRuleNode: Node
  bodyRuleNodes: Node[]
  filePath: string
  partialRule?: Partial<types.RuleDefinition>
}): types.Rule {
  const firstNonBodyRuleNodeIndex = bodyRuleNodes.findIndex(
    (node) => node.type === 'heading'
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

  const title = convertASTToPlaintext(headingRuleNode)
  assert(title, 'Rule title must not be empty')

  const fileNameRuleName = path.basename(filePath).replace(/\.\w+$/, '')
  const defaultRuleName = isValidRuleName(fileNameRuleName)
    ? fileNameRuleName
    : slugify(title).trim()

  const description = convertASTToMarkdown(bodyRuleNode)

  const rule: types.Rule = pruneUndefined({
    name: defaultRuleName,
    title,
    description,
    positiveExamples: [],
    negativeExamples: [],
    cacheable: true,
    level: 'error',
    scope: 'file',
    source: filePath,
    metadata: {},
    ...partialRule
  })
  assert(rule.name, `Rule name must not be empty: ${title}`)

  assert(
    isValidRuleName(rule.name),
    `Rule name is invalid "${rule.name}": ${title}`
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

    const sectionLabel = convertASTToPlaintext(h3Node).toLowerCase().trim()
    const isPositive =
      /\bgood\b/i.test(sectionLabel) ||
      /\bcorrect\b/.test(sectionLabel) ||
      /\bpass\b/.test(sectionLabel)
    const isNegative =
      /\bbad\b/i.test(sectionLabel) ||
      /\bincorrect\b/.test(sectionLabel) ||
      /\bfail\b/.test(sectionLabel)

    assert(
      isPositive || isNegative,
      `Rule h3 header for examples section "${sectionLabel}" must include a known positive label (good, correct, or pass) or negative label (bad, incorrect, or fail): ${rule.name} (${filePath})`
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
      const code = convertASTToPlaintext(codeBlockNode)
      const language = codeBlockNode.lang || undefined

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

/**
 * A unist utility to get all children of a parent between two nodes or indices.
 *
 * This differs from the official `unist-util-find-all-between` to behave more like
 * `Array.slice` so if we don't specify the `end` parameter, it will default to
 * returning all nodes up until the end of the parent's children.
 *
 * @param parent Parent node to search in
 * @param start A node or index to start from (exclusive)
 * @param end An optional node or index to end with (exclusive)
 * @param test An optional test passed to `unist-util-is` that nodes must pass to be included in the results
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
    let index = 0

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

    if (
      Number.isNaN(index) ||
      index < 0 ||
      index === Number.POSITIVE_INFINITY
    ) {
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

export function findAllHeadingNodes(
  tree: Root,
  { depth }: { depth?: number } = {}
) {
  return tree.children.filter(
    (node) =>
      node.type === 'heading' && (depth === undefined || node.depth === depth)
  ) as Heading[]
}

export function findAllYAMLNodes(tree: Root) {
  return tree.children.filter((node) => node.type === 'yaml') as Yaml[]
}
