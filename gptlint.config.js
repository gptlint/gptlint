import 'dotenv/config'

// /** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    llmOptions: {
      model: 'gpt-4-turbo-preview'
    }
  }
]

// This example uses Anthropic Claude.
// export default [
//   {
//     llmOptions: {
//       apiBaseUrl: 'https://openrouter.ai/api/v1',
//       // eslint-disable-next-line no-process-env
//       apiKey: process.env.OPENROUTER_API_KEY,
//       model: 'anthropic/claude-3-haiku:beta',
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
