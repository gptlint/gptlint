import { ChatModel, createOpenAIClient } from '@dexaai/dexter'

import type * as types from './types.js'
import { assert } from './utils.js'

export function createChatModel(config: types.ResolvedLinterConfig) {
  const { llmOptions, linterOptions } = config
  assert(llmOptions)
  assert(linterOptions)

  const client = createOpenAIClient({
    apiKey: llmOptions.apiKey,
    organizationId: llmOptions.apiOrganizationId,
    baseUrl: llmOptions.apiBaseUrl,
    kyOptions: llmOptions.kyOptions
  })

  if (config.linterOptions.dryRun) {
    client.createChatCompletion = createChatCompletionDryRun
  }

  return new ChatModel({
    client,
    params: {
      model: llmOptions.model,
      temperature: llmOptions.temperature
    },
    debug: !!linterOptions.debugModel
  })
}

type OpenAIClient = ReturnType<typeof createOpenAIClient>
type ChatParams = NonNullable<
  Parameters<OpenAIClient['createChatCompletion']>[0]
>
type ChatOptions = NonNullable<
  Parameters<OpenAIClient['createChatCompletion']>[1]
>
type ChatResponse = Awaited<ReturnType<OpenAIClient['createChatCompletion']>>

async function createChatCompletionDryRun(
  params: ChatParams,
  _opts?: ChatOptions
): Promise<ChatResponse> {
  const inputMessageText = params.messages.map((m) => m.content).join('\n')
  const output = `# EXPLANATION

This is a fake LLM response because the \`dryRun\` option was set. No actual API request was made.

# VIOLATIONS

\`\`\`json
[]
\`\`\`
`

  const numPromptTokensEstimate = Math.ceil(inputMessageText.length / 3)
  const numCompletionTokensEstimate = 120
  const numTotalTokensEstimate =
    numPromptTokensEstimate + numCompletionTokensEstimate

  return {
    id: 'chat:dry-run-id',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: params.model,
    system_fingerprint: 'dry-run-fingerprint',
    choices: [
      {
        finish_reason: 'stop',
        logprobs: null,
        index: 0,
        message: {
          role: 'assistant',
          content: output
        }
      }
    ],
    usage: {
      prompt_tokens: numPromptTokensEstimate,
      completion_tokens: numCompletionTokensEstimate,
      total_tokens: numTotalTokensEstimate
    }
  }
}
