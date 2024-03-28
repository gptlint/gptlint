import findCacheDirectory from 'find-cache-dir'
import type { MergeDeep, SetRequired, Simplify } from 'type-fest'
import type { SimplifyDeep } from 'type-fest/source/merge-deep.js'
import { z } from 'zod'

import { dedupe, getEnv, pruneUndefined } from './utils.js'

export const LinterConfigRuleSettingSchema = z.enum(['off', 'warn', 'error'])
export type LinterConfigRuleSetting = z.infer<
  typeof LinterConfigRuleSettingSchema
>

// TODO: update when we decide on a project name
export const defaultCacheDir =
  findCacheDirectory({ name: 'gptlint' }) ?? '.gptlint'

export const LLMOptionsSchema = z.object({
  model: z
    .string()
    .optional()
    .describe('Which LLM to use for assessing rule conformance.'),

  temperature: z
    .number()
    .min(0.0)
    .max(2.0)
    .optional()
    .describe('LLM temperature parameter.'),

  apiKey: z
    .string()
    .optional()
    .describe(
      'API key for the OpenAI-compatible LLM API. Defaults to the value of the `OPENAI_API_KEY` environment variable.'
    ),

  apiOrganizationId: z
    .string()
    .optional()
    .describe(
      'Optional organization ID that should be billed for LLM API requests. This is only necessary if your OpenAI API key is scoped to multiple organizations.'
    ),

  apiBaseUrl: z
    .string()
    .optional()
    .describe(
      'Base URL for the OpemAI-compatible LLM API. Defaults to the OpenAI API `https://api.openai.com/v1`'
    ),

  kyOptions: z
    .record(z.any())
    .optional()
    .describe(
      'Additional options for customizing HTTP calls to the LLM API, such as custom `headers` to pass with every request. All options are passed to `ky` which is the HTTP `fetch` wrapper used under the hood.'
    )
})
export type LLMOptions = z.infer<typeof LLMOptionsSchema>

export const LinterOptionsSchema = z.object({
  noInlineConfig: z
    .boolean()
    .optional()
    .describe('A Boolean value for whether inline configuration is allowed.'),

  earlyExit: z
    .boolean()
    .optional()
    .describe(
      'A Boolean value for whether to exit greedily after finding the first error.'
    ),

  debug: z.boolean().optional().describe('Enables debug logging.'),
  debugConfig: z
    .boolean()
    .optional()
    .describe(
      'When enabled, logs the resolved config and parsed rules and then exits.'
    ),
  debugModel: z.boolean().optional().describe('Enables verbose LLM logging.'),
  debugStats: z
    .boolean()
    .optional()
    .describe(
      'Enables logging of cumulative LLM stats (total tokens and cost).'
    ),

  noCache: z.boolean().optional().describe('Disables the built-in cache.'),
  disabled: z.boolean().optional().describe('Disables linting entirely.'),

  cacheDir: z
    .string()
    .optional()
    .describe('A string path to the shared cache directory.')
})
export type LinterOptions = z.infer<typeof LinterOptionsSchema>

export const LinterConfigSchema = z.object({
  files: z
    .array(z.string())
    .optional()
    .describe(
      'An array of glob patterns for the files to process. If not specified, the configuration object applies to all files matched by any other configuration object.'
    ),

  ignores: z
    .array(z.string())
    .optional()
    .describe('An array of glob patterns for files that should be ignored.'),

  guidelineFiles: z
    .array(z.string())
    .optional()
    .describe(
      'An array of glob patterns to guideline markdown files containing project-specific rule definitions.'
    ),

  ruleFiles: z
    .array(z.string())
    .optional()
    .describe('An array of glob patterns to rule definition markdown files.'),

  rules: z
    .record(z.string(), LinterConfigRuleSettingSchema)
    .optional()
    .describe('An object customizing the configured rules.'),

  linterOptions: LinterOptionsSchema.optional().describe(
    'An object containing settings related to the linting process.'
  ),

  llmOptions: LLMOptionsSchema.optional().describe('')
})
export type LinterConfig = z.infer<typeof LinterConfigSchema>

export type ResolvedLinterConfig = Simplify<
  Omit<
    SetRequired<LinterConfig, keyof LinterConfig>,
    'linterOptions' | 'llmOptions'
  > & {
    linterOptions: SetRequired<LinterOptions, keyof LinterOptions>
    llmOptions: SetRequired<LLMOptions, 'model'>
  }
>

export const defaultLinterOptions: Readonly<LinterOptions> = {
  noInlineConfig: false,
  earlyExit: false,
  debug: false,
  debugConfig: false,
  debugModel: false,
  debugStats: true,
  disabled: false,
  noCache: false,
  cacheDir: defaultCacheDir
}

export const defaultLLMOptions: Readonly<LLMOptions> = {
  apiKey: getEnv('OPENAI_API_KEY'),
  apiBaseUrl: 'https://api.openai.com/v1',
  // model: 'gpt-4-turbo-preview',
  model: 'gpt-3.5-turbo',
  temperature: 0
}

export const defaultLinterConfig: Readonly<
  SetRequired<LinterConfig, 'linterOptions' | 'llmOptions'>
> = {
  linterOptions: defaultLinterOptions,
  llmOptions: defaultLLMOptions
}

export function parseLinterConfig(config: Partial<LinterConfig>): LinterConfig {
  return LinterConfigSchema.parse(config)
}

export function mergeLinterConfigs<
  ConfigTypeA extends LinterConfig = LinterConfig,
  ConfigTypeB extends LinterConfig = LinterConfig
>(
  configA: ConfigTypeA,
  configB: ConfigTypeB
): SimplifyDeep<MergeDeep<ConfigTypeA, ConfigTypeB>> {
  return {
    ...pruneUndefined(configA),
    ...pruneUndefined(configB),
    rules: { ...configA.rules, ...configB.rules },
    ignores:
      configA.ignores || configB.ignores
        ? dedupe([...(configA.ignores ?? []), ...(configB.ignores ?? [])])
        : undefined,
    linterOptions:
      configA.linterOptions || configB.linterOptions
        ? {
            ...pruneUndefined(configA.linterOptions ?? {}),
            ...pruneUndefined(configB.linterOptions ?? {})
          }
        : undefined,
    llmOptions:
      configA.llmOptions || configB.llmOptions
        ? {
            ...pruneUndefined(configA.llmOptions ?? {}),
            ...pruneUndefined(configB.llmOptions ?? {})
          }
        : undefined
  } as SimplifyDeep<MergeDeep<ConfigTypeA, ConfigTypeB>>
}
