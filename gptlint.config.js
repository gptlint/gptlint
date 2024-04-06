import 'dotenv/config'

/** @type {import('gptlint').GPTLintConfig} */
export default [
  // {
  //   files: ['**/*.{js,ts,jsx,tsx,cjs,mjs}'],
  //   rules: {
  //     'always-handle-promises': 'error',
  //     'consistent-identifier-casing': 'error',
  //     'liberal-accept-strict-produce': 'error',
  //     'no-hardcoded-secrets': 'error',
  //     'prefer-array-at-negative-indexing': 'error',
  //     'prefer-defensive-programming': 'error',
  //     'prefer-early-return': 'error',
  //     'prefer-fetch-over-axios': 'error',
  //     'react-avoid-class-components': 'error',
  //     'semantic-variable-names': 'error'
  //   }
  // },
  // {
  //   files: ['**/*.{ts,tsx}'],
  //   rules: {
  //     'avoid-type-info-in-docs': 'error',
  //     'prefer-types-always-valid-states': 'error'
  //   }
  // },
  {
    llmOptions: {
      model: 'gpt-4-turbo-preview',
      weakModel: 'gpt-3.5-turbo'
    },
    rules: {
      'always-handle-promises': {
        setting: 'error',
        files: ['**/*.{js,ts,jsx,tsx,cjs,mjs}']
      }
    }
  }
]

// This example uses Anthropic Claude.
/** @type {import('gptlint').GPTLintConfig} */
// export default [
//   {
//     llmOptions: {
//       apiBaseUrl: 'https://openrouter.ai/api/v1',
//       // eslint-disable-next-line no-process-env
//       apiKey: process.env.OPENROUTER_API_KEY,
//       model: 'anthropic/claude-3-opus:beta',
//       weakModel: 'anthropic/claude-3-haiku:beta',
//       // Optional
//       kyOptions: {
//         headers: {
//           // Optional, for including your app on openrouter.ai rankings.
//           'HTTP-Referer': 'https://github.com/GPTLint/GPTLint',
//           // Optional, shows in rankings on openrouter.ai.
//           'X-Title': 'gptlint'
//         }
//       }
//     }
//   }
// ]
