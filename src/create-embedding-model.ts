import { createOpenAIClient, EmbeddingModel } from '@dexaai/dexter'

import type * as types from './types.js'

export function createEmbeddingModel(config: types.ResolvedLinterConfig) {
  const { llmOptions } = config

  return new EmbeddingModel({
    client: createOpenAIClient({
      apiKey: llmOptions.apiKey,
      organizationId: llmOptions.apiOrganizationId,
      baseUrl: llmOptions.apiBaseUrl,
      kyOptions: llmOptions.kyOptions
    })
  })
}
