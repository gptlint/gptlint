import { ChatModel, createOpenAIClient } from '@dexaai/dexter'

import type * as types from './types.js'
import { assert } from './utils.js'

export function createChatModel(config: types.ResolvedLinterConfig) {
  const { llmOptions, linterOptions } = config
  assert(llmOptions)
  assert(linterOptions)

  return new ChatModel({
    client: createOpenAIClient({
      apiKey: llmOptions.apiKey,
      organizationId: llmOptions.apiOrganizationId,
      baseUrl: llmOptions.apiBaseUrl,
      kyOptions: llmOptions.kyOptions
    }),
    params: {
      model: llmOptions.model,
      temperature: llmOptions.temperature
    },
    debug: !!linterOptions.debugModel
  })
}
