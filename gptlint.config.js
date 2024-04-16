import 'dotenv/config'

// import * as ruleDefinitions from './dist/.gptlint/custom/index.js'

/** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    // TODO: need a way to disable built-in rules
    // ruleFiles: ['.gptlint/**/*.md'],
    // ruleFiles: [],
    // ruleDefinitions: Object.values(ruleDefinitions),
    llmOptions: {
      model: 'gpt-4-turbo-preview',
      weakModel: 'gpt-3.5-turbo'
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
//           // Optional, for including your app on openrouter.ai rankings
//           'HTTP-Referer': 'https://gptlint.dev',
//           // Optional, shows in rankings on openrouter.ai
//           'X-Title': 'gptlint'
//         }
//       }
//     }
//   }
// ]
