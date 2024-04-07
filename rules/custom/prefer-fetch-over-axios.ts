import { parseRuleFilePath, type Rule } from '../../src/index.js'

const ruleFile = await parseRuleFilePath('./prefer-fetch-over-axios.md', {
  cwd: import.meta.dirname
})

const rule: Readonly<Rule> = {
  ...ruleFile,

  preProcessFile: async (ctx) => {
    if (!/["']axios["']/g.test(ctx.file.content)) {
      // Skip linting because we know the file doesn't use axios
      return {
        lintErrors: []
      }
    } else {
      // Lint the file normally if it contains axios
    }
  }
}

export default rule
