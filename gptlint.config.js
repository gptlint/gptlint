import 'dotenv/config'
import { recommendedConfig } from './dist/src/index.js'

/** @type {import('gptlint').GPTLintConfig} */
export default [
  ...recommendedConfig,
  {
    llmOptions: {
      model: 'gpt-4-turbo-preview',
      weakModel: 'gpt-3.5-turbo'
    }
  }
]

// This example uses Anthropic Claude.
/** @type {import('gptlint').GPTLintConfig} */
// export default [
//   ...recommendedConfig,
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

// This example uses LLama3 via Groq.
/** @type {import('gptlint').GPTLintConfig} */
// export default [
//   ...recommendedConfig,
//   {
//     llmOptions: {
//       apiBaseUrl: 'https://api.groq.com/openai/v1',
//       // eslint-disable-next-line no-process-env
//       apiKey: process.env.GROQ_API_KEY,
//       model: 'llama3-70b-8192',
//       weakModel: 'llama3-8b-8192'
//     }
//   }
// ]
