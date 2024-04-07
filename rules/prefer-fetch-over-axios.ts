import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Rule } from '../src/types.js'
import { parseRuleFilePath } from '../src/parse-rule-file.js'

const ruleFile = await parseRuleFilePath('./prefer-fetch-over-axios.md', {
  cwd: import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url))
})

const rule: Readonly<Rule> = {
  ...ruleFile,

  preProcessFile: async (ctx) => {
    if (/["']axios["']/g.test(ctx.file.content)) {
      return {
        lintErrors: [
          {
            message: 'Use `fetch` instead of `axios`'
          }
        ]
      }
    } else {
      // Skip linting because we know the file doesn't use axios
      return {
        lintErrors: []
      }
    }
  }
}

export default rule
