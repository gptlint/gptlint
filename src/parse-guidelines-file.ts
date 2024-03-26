import type { Code, Heading, Node, Root } from 'mdast'
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
    const ruleNode: Root = {
      type: 'root',
      children: ruleNodes as any
    }

    const message = toString(ruleHeading).trim()
    assert(message, 'Rule message must not be empty')

    const name = slugify(message).trim()
    assert(name, `Rule name must not be empty: ${message}`)

    const desc = toString(ruleNode).trim()

    // const nonCodeBlockNodes = ruleNodes.filter(
    //   (ruleNode) => ruleNode.type !== 'code'
    // )
    // const source = toMarkdown({
    //   type: 'root',
    //   children: [ruleHeading].concat(nonCodeBlockNodes as any)
    // })

    const positiveExamples: types.RuleExample[] = []
    const negativeExamples: types.RuleExample[] = []
    const codeBlocksNodes = ruleNodes.filter(
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
        positiveExamples.push({ code, language })
      } else if (/bad/i.test(codeBlockNode.meta)) {
        negativeExamples.push({ code, language })
      } else {
        throw new Error(
          `Rule code block must specify whether it is a good or bad example for rule "${name}": ${toString(
            codeBlockNode
          )}`
        )
      }
    }

    rules.push({
      name,
      message,
      desc,
      positiveExamples,
      negativeExamples
    })

    // console.log(inspectColor(ruleNode, { showPositions: false }))
    // console.log()
  }

  return rules
}
