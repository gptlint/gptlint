import type { RuleDefinition } from '../../src/index.js'

const rule: Readonly<RuleDefinition> = {
  name: 'prefer-fetch-over-axios',
  level: 'error',
  scope: 'file',
  title: 'Prefer fetch over axios',
  description: `The NPM package \`axios\` should be avoided in favor of native \`fetch\`. Now that native \`fetch\` has widespread support, \`axios\` is effectively deprecated and is generally a code smell when encountered.

  Convenience wrappers around \`fetch\` such as \`ky\` and \`ofetch\` are encouraged.
  
  Code which doesn't use the \`axios\` module should be ignored.
 `,

  tags: ['best practices'],
  eslint: ['no-restricted-imports'],

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
