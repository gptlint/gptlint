import { ChatModel, createOpenAIClient } from '@dexaai/dexter'

import type * as types from './types.js'

export function createChatModel(config: types.ResolvedLinterConfig) {
  return new ChatModel({
    client: createOpenAIClient({
      apiKey: config.llmOptions.apiKey,
      organizationId: config.llmOptions.apiOrganizationId,
      baseUrl: config.llmOptions.apiBaseUrl,
      kyOptions: config.llmOptions.kyOptions
    }),
    params: {
      model: config.llmOptions.model,
      temperature: config.llmOptions.temperature
    },
    debug: !!config.linterOptions.debugModel
  })
}
