import type { Code, Heading, Node, Root, Table } from 'mdast'
import { toString } from 'mdast-util-to-string'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import findAllBetween from 'unist-util-find-all-between'
// import { inspectColor } from 'unist-util-inspect'
import { visit } from 'unist-util-visit'

import type * as types from './types.js'
import { assert, slugify } from './utils.js'

export async function parseGuidelinesFile(
  content: string
): Promise<types.Rule[]> {
  const ast = unified().use(remarkParse).use(remarkGfm).parse(content)
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

  for (let i = 0; i < h2Rules.length; ++i) {
    const ruleHeading = h2Rules[i]!
    const ruleNodes: Node[] = findAllBetween(
      ast,
      ruleHeading,
      h2Rules[i + 1] ?? ast.children.at(-1)!
    )
    const bodyRuleNodes = ruleNodes.filter(
      (ruleNode) => ruleNode.type !== 'table'
    )
    const tableRuleNodes = ruleNodes.filter(
      (ruleNode) => ruleNode.type === 'table'
    ) as Table[]

    const ruleNode: Root = {
      type: 'root',
      children: bodyRuleNodes as any
    }

    const message = toString(ruleHeading).trim()
    assert(message, 'Rule message must not be empty')

    assert(
      tableRuleNodes.length <= 1,
      `Rule must not contain more than 1 markdown table: ${message}`
    )

    const name = slugify(message).trim()
    assert(name, `Rule name must not be empty: ${message}`)

    const desc = toString(ruleNode).trim()

    const rule: types.Rule = {
      name,
      message,
      desc,
      positiveExamples: [],
      negativeExamples: []
    }

    if (tableRuleNodes.length === 1) {
      const tableNode = tableRuleNodes[0]!
      const headerRow = tableNode.children[0]
      const bodyRows = tableNode.children.slice(1)

      assert(
        headerRow?.type === 'tableRow',
        `Rule contains invalid table: ${message}`
      )
      assert(
        headerRow.children.length === 2,
        `Rule contains invalid table (must have 2 columns): ${message}`
      )
      assert(
        toString(headerRow.children[0]).toLowerCase().trim() === 'key',
        `Rule contains invalid table (first column must be "key"): ${message}`
      )
      assert(
        toString(headerRow.children[1]).toLowerCase().trim() === 'value',
        `Rule contains invalid table (first column must be "value"): ${message}`
      )
      assert(
        bodyRows.length > 0,
        `Rule contains invalid table (empty table body): ${message}`
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
          `Rule contains invalid table (body rows must have 2 columns): ${message}`
        )

        const key = toString(bodyRow.children[0]).toLowerCase().trim()
        assert(
          validRuleTableKeysL.has(key),
          `Rule contains invalid table (unsupported key "${key}"): ${message}`
        )

        const value = toString(bodyRow.children[1]).toLowerCase().trim()
        if (key === 'name') {
          assert(
            value,
            `Rule contains invalid table ("name" must not be empty): ${message}`
          )

          rule.name = value
        } else if (key === 'level') {
          assert(
            value === 'warn' || value === 'error' || value === 'off',
            `Rule contains invalid table ("level" must be one of "warn" | "error" | "off"): ${message}`
          )

          rule.level = value
        } else if (key === 'fixable') {
          assert(
            value === 'true' || value === 'false',
            `Rule contains invalid table ("fixable" must be one of "true" | "false"): ${message}`
          )

          rule.fixable = value === 'true'
        } else if (key === 'tags') {
          rule.tags = value.split(',').map((v) => v.trim())
        } else if (key === 'languages') {
          rule.languages = value.split(',').map((v) => v.trim())
        } else {
          assert(
            false,
            `Rule contains invalid table (unsupported key "${key}"): ${message}`
          )
        }
      }
    }

    // const nonCodeBlockNodes = bodyRuleNodes.filter(
    //   (ruleNode) => ruleNode.type !== 'code'
    // )
    // const source = toMarkdown({
    //   type: 'root',
    //   children: [ruleHeading].concat(nonCodeBlockNodes as any)
    // })

    const codeBlocksNodes = bodyRuleNodes.filter(
      (ruleNode) => ruleNode.type === 'code'
    ) as Code[]

    for (const codeBlockNode of codeBlocksNodes) {
      assert(
        codeBlockNode.meta,
        `Rule code block must specify whether it is a good or bad example for rule "${name}": ${toString(
          codeBlockNode
        )}`
      )

      const code = toString(codeBlockNode)
      const language = codeBlockNode.lang ? codeBlockNode.lang : undefined

      if (/good/i.test(codeBlockNode.meta)) {
        rule.positiveExamples!.push({ code, language })
      } else if (/bad/i.test(codeBlockNode.meta)) {
        rule.negativeExamples!.push({ code, language })
      } else {
        throw new Error(
          `Rule code block must specify whether it is a good or bad example for rule "${name}": ${toString(
            codeBlockNode
          )}`
        )
      }
    }

    rules.push(rule)

    // console.log(inspectColor(ruleNode, { showPositions: false }))
    // console.log()
  }

  return rules
}
