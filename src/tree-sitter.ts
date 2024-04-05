import Parser from 'tree-sitter'
import TS from 'tree-sitter-typescript'

// declare module 'tree-sitter-typescript' {
//   // eslint-disable-next-line @typescript-eslint/naming-convention
//   export type typescript = {
//     nodeTypeInfo: any
//   }
// }

const parser = new Parser()
parser.setLanguage(TS.typescript)

const sourceCode = 'let x = 1; console.log(x);'
const tree = parser.parse(sourceCode)

console.log(tree.rootNode.toString())

const callExpression = tree.rootNode.child(1)!.firstChild
console.log(callExpression)
