import { ChatModel, createOpenAIClient } from '@dexaai/dexter'

import type * as types from './types.js'

export function createChatModel(config: types.ResolvedLinterConfig) {
  const { llmOptions, linterOptions } = config

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
