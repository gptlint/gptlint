import type { MergeDeep, SetRequired, Simplify } from 'type-fest'
import type { SimplifyDeep } from 'type-fest/source/merge-deep.js'
import findCacheDirectory from 'find-cache-dir'
import { z } from 'zod'

import type * as types from './types.js'
import { RuleDefinitionSchema } from './rule.js'
import {
  dedupe,
  fileMatchesIncludeExclude,
  getEnv,
  pruneUndefined
} from './utils.js'

export const LinterConfigRuleSettingSchema = z.enum(['off', 'warn', 'error'])
export type LinterConfigRuleSetting = z.infer<
  typeof LinterConfigRuleSettingSchema
>

export const LinterConfigRuleSettingsSchema = z.record(
  z.string(),
  LinterConfigRuleSettingSchema
)
export type LinterConfigRuleSettings = z.infer<
  typeof LinterConfigRuleSettingsSchema
>

export const defaultCacheDir =
  findCacheDirectory({ name: 'gptlint' }) ?? '.gptlint'

export const LLMOptionsSchema = z
  .object({
    model: z
      .string()
      .optional()
      .describe('Which LLM to use for assessing rule conformance.'),

    weakModel: z
      .string()
      .optional()
      .nullable()
      .describe(
        'If defined, will use a two-pass approach for assessing rule conformance. The `weakModel` should be cheaper and will be used to generate potential rule violations, with the stronger `model` being used in a second pass to validate these potential rule violations and filter out false positives. Set to "none" or `null` to disable two-pass linting.'
      ),

    temperature: z
      .number()
      .min(0.0)
      .max(2.0)
      .optional()
      .describe('LLM temperature parameter.'),

    modelSupportsJsonResponseFormat: z
      .boolean()
      .optional()
      .describe(
        "A Boolean value indicating whether or not `model` supports OpenAI's JSON output mode."
      ),

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
  .strict()
export type LLMOptions = z.infer<typeof LLMOptionsSchema>

export const LinterOptionsSchema = z
  .object({
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
    printConfig: z
      .boolean()
      .optional()
      .describe(
        'When enabled, logs the resolved config and parsed rules and then exits.'
      ),
    debugModel: z.boolean().optional().describe('Enables verbose LLM logging.'),
    debugGrit: z.boolean().optional().describe('Enables verbose Grit logging.'),
    debugStats: z
      .boolean()
      .optional()
      .describe(
        'Enables logging of cumulative LLM stats (total tokens and cost).'
      ),

    noCache: z.boolean().optional().describe('Disables the built-in cache.'),
    noGrit: z.boolean().optional().describe('Disables grit.'),
    disabled: z.boolean().optional().describe('Disables linting entirely.'),

    dryRun: z
      .boolean()
      .optional()
      .describe(
        'Disables all external LLM calls and outputs an estimate of what it would cost to run the linter on the given config.'
      ),

    cacheDir: z
      .string()
      .optional()
      .describe('A string path to the shared cache directory.'),

    concurrency: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe('Limits the maximum number of concurrent tasks.')
  })
  .strict()
export type LinterOptions = z.infer<typeof LinterOptionsSchema>

export const LinterConfigOverrideSchema = z
  .object({
    include: z
      .array(z.string())
      .optional()
      .describe(
        'An optional array of glob patterns for the files to process. If not specified, the configuration object applies to all files matched by any other configuration object.'
      ),

    exclude: z
      .array(z.string())
      .optional()
      .describe(
        'An optional array of glob patterns for source files that should be ignored.'
      ),

    rules: LinterConfigRuleSettingsSchema.optional().describe(
      'An object customizing the configured rules.'
    )
  })
  .strict()
export type LinterConfigOverride = z.infer<typeof LinterConfigOverrideSchema>

export const LinterConfigOverridesSchema = z.array(LinterConfigOverrideSchema)
export type LinterConfigOverrides = z.infer<typeof LinterConfigOverridesSchema>

export const LinterConfigSchema = z
  .object({
    files: z
      .array(z.string())
      .optional()
      .describe(
        'An optional array of glob patterns for the files to process. If not specified, the configuration object applies to all files matched by any other configuration object.'
      ),

    ignores: z
      .array(z.string())
      .optional()
      .describe(
        'An optional array of glob patterns for source files that should be ignored.'
      ),

    ruleFiles: z
      .array(z.string())
      .optional()
      .describe('An array of glob patterns to rule definition markdown files.'),

    ruleDefinitions: z
      .array(RuleDefinitionSchema)
      .optional()
      .describe(
        'An array of custom rule definitions which are better expressed in code as opposed to the `ruleFiles` definitions which are expressed as markdown. These rule definitions will be merged with the rules definitions inferred by `ruleFiles`.'
      ),

    rules: LinterConfigRuleSettingsSchema.optional().describe(
      'An object customizing the configured rules.'
    ),

    linterOptions: LinterOptionsSchema.optional().describe(
      'An object containing settings related to the linting process.'
    ),

    llmOptions: LLMOptionsSchema.optional().describe(''),

    overrides: LinterConfigOverridesSchema.optional().describe(
      'Rule config overrides for specific file patterns.'
    )
  })
  .strict()
export type LinterConfig = z.infer<typeof LinterConfigSchema>
export type GPTLintConfig = LinterConfig[]

export type ResolvedLinterOptions = Simplify<
  SetRequired<LinterOptions, keyof LinterOptions>
>
export type ResolvedLLMOptions = Simplify<SetRequired<LLMOptions, 'model'>>

export type FullyResolvedLinterConfig = Simplify<
  Omit<
    SetRequired<LinterConfig, keyof LinterConfig>,
    'linterOptions' | 'llmOptions'
  > & {
    linterOptions: ResolvedLinterOptions
    llmOptions: ResolvedLLMOptions
  }
>

export const defaultLinterOptions: Readonly<LinterOptions> = {
  noInlineConfig: false,
  earlyExit: false,
  concurrency: 24,
  debug: false,
  printConfig: false,
  debugModel: false,
  debugGrit: false,
  debugStats: true,
  disabled: false,
  noCache: false,
  noGrit: false,
  dryRun: false,
  cacheDir: defaultCacheDir
}

export const defaultLLMOptions: Readonly<LLMOptions> = {
  apiKey: getEnv('OPENAI_API_KEY'),
  apiBaseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4-turbo',
  weakModel: 'gpt-3.5-turbo',
  temperature: 0
}

export const defaultLinterConfig: Readonly<
  SetRequired<LinterConfig, 'linterOptions' | 'llmOptions'>
> = {
  ruleFiles: ['.gptlint/**/*.md', '!.gptlint/readme.md', '!.gptlint/README.md'],
  linterOptions: defaultLinterOptions,
  llmOptions: defaultLLMOptions
}

export function parseLinterConfig(config: Partial<LinterConfig>): LinterConfig {
  return LinterConfigSchema.parse(config)
}

export function isValidModel(
  model?: string | null
): model is NonNullable<string> {
  return !!model && model !== 'none'
}

function dedupeRuleDefinitions(ruleDefinitions: types.RuleDefinition[]) {
  const seen = new Set<string>()
  return ruleDefinitions.filter((ruleDefinition) => {
    if (!seen.has(ruleDefinition.name)) {
      seen.add(ruleDefinition.name)
      return true
    }

    return false
  })
}

/** Union two configs together, with the second one taking precedence */
export function mergeLinterConfigs<
  ConfigTypeA extends LinterConfig = LinterConfig,
  ConfigTypeB extends LinterConfig = LinterConfig
>(
  configA: ConfigTypeA,
  configB: ConfigTypeB
): SimplifyDeep<MergeDeep<ConfigTypeA, ConfigTypeB>> {
  return pruneUndefined({
    ...pruneUndefined(configA),
    ...pruneUndefined(configB),
    files:
      configA.files || configB.files
        ? dedupe(
            [...(configA.files ?? []), ...(configB.files ?? [])].filter(Boolean)
          )
        : undefined,
    ignores:
      configA.ignores || configB.ignores
        ? dedupe(
            [...(configA.ignores ?? []), ...(configB.ignores ?? [])].filter(
              Boolean
            )
          )
        : undefined,
    ruleFiles:
      configA.ruleFiles || configB.ruleFiles
        ? dedupe(
            [...(configA.ruleFiles ?? []), ...(configB.ruleFiles ?? [])].filter(
              Boolean
            )
          )
        : undefined,
    ruleDefinitions:
      configA.ruleDefinitions || configB.ruleDefinitions
        ? dedupeRuleDefinitions([
            ...(configA.ruleDefinitions ?? []),
            ...(configB.ruleDefinitions ?? [])
          ])
        : undefined,
    rules:
      configA.rules || configB.rules
        ? {
            ...pruneUndefined(configA.rules ?? {}),
            ...pruneUndefined(configB.rules ?? {})
          }
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
        : undefined,
    overrides:
      configA.overrides || configB.overrides
        ? [...(configA.overrides ?? []), ...(configB.overrides ?? [])].filter(
            Boolean
          )
        : undefined
  }) as any
}

/**
 * Union two configs together, with the second one taking precedence, but
 * allow certain fields of the second config to override the first instead of
 * joining them together.
 *
 * This is used to allow CLI config values to completely override other configs.
 */
export function mergeLinterConfigsOverride<
  ConfigTypeA extends LinterConfig = LinterConfig,
  ConfigTypeB extends LinterConfig = LinterConfig
>(
  configA: ConfigTypeA,
  configB: ConfigTypeB
): SimplifyDeep<MergeDeep<ConfigTypeA, ConfigTypeB>> {
  return pruneUndefined({
    ...pruneUndefined(configA),
    ...pruneUndefined(configB),
    ruleFiles:
      configB.ruleFiles || configB.ruleDefinitions
        ? configB.ruleFiles ?? []
        : configA.ruleFiles,
    ruleDefinitions:
      configB.ruleFiles || configB.ruleDefinitions
        ? configB.ruleDefinitions ?? []
        : configA.ruleDefinitions,
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
        : undefined,
    overrides:
      configA.overrides || configB.overrides
        ? [...(configA.overrides ?? []), ...(configB.overrides ?? [])].filter(
            Boolean
          )
        : undefined
  }) as any
}

export function mergeLinterConfigRuleSettings(
  rulesA?: LinterConfigRuleSettings,
  rulesB?: LinterConfigRuleSettings
): LinterConfigRuleSettings {
  return {
    ...pruneUndefined(rulesA ?? {}),
    ...pruneUndefined(rulesB ?? {})
  }
}

export function resolveLinterConfig(
  config: Partial<LinterConfig>
): FullyResolvedLinterConfig {
  return mergeLinterConfigs(
    {
      files: [],
      ignores: [],
      ruleFiles: [],
      ruleDefinitions: [],
      rules: {},
      linterOptions: defaultLinterOptions,
      llmOptions: defaultLLMOptions,
      overrides: []
    },
    config
  ) as FullyResolvedLinterConfig
}

export class ResolvedLinterConfig
  implements
    Pick<
      FullyResolvedLinterConfig,
      | 'files'
      | 'ignores'
      | 'ruleFiles'
      | 'ruleDefinitions'
      | 'rules'
      | 'linterOptions'
      | 'llmOptions'
    >
{
  readonly config: FullyResolvedLinterConfig
  readonly ruleSettingsFileCache = new Map<
    string,
    types.LinterConfigRuleSettings
  >()

  constructor({
    configs,
    cliConfigOverride
  }: {
    configs: LinterConfig[]
    cliConfigOverride: LinterConfig
  }) {
    let linterConfig: types.LinterConfig = {}

    for (const config of configs) {
      linterConfig = mergeLinterConfigs(linterConfig, config)
    }

    linterConfig = mergeLinterConfigsOverride(linterConfig, cliConfigOverride)
    this.config = resolveLinterConfig(linterConfig)

    if (this.config.files.length === 0 && !cliConfigOverride.files) {
      this.config.files = ['**/*.{js,ts,jsx,tsx,cjs,mjs}']
    }

    // console.log(
    //   'config',
    //   JSON.stringify(
    //     {
    //       configs: configs.map((c) => sanitizeConfig(c)),
    //       cliConfigOverride: sanitizeConfig(cliConfigOverride),
    //       resolvedConfig: sanitizeConfig(this.config)
    //     },
    //     null,
    //     2
    //   )
    // )
  }

  get files(): string[] {
    return this.config.files
  }

  get ignores(): string[] {
    return this.config.ignores
  }

  get ruleFiles(): string[] {
    return this.config.ruleFiles
  }

  get rules(): LinterConfigRuleSettings {
    return this.config.rules
  }

  get ruleDefinitions(): types.RuleDefinition[] {
    return this.config.ruleDefinitions
  }

  get linterOptions(): ResolvedLinterOptions {
    return this.config.linterOptions
  }

  get llmOptions(): ResolvedLLMOptions {
    return this.config.llmOptions
  }

  getRuleSettingsForFile(
    file: types.SourceFile
  ): types.LinterConfigRuleSettings {
    if (this.ruleSettingsFileCache.has(file.fileRelativePath)) {
      return this.ruleSettingsFileCache.get(file.fileRelativePath)!
    }

    const settings =
      this.config.overrides ??
      [].filter((override) => fileMatchesIncludeExclude(file, override))

    let rules: LinterConfigRuleSettings = {}
    for (const setting of settings) {
      rules = mergeLinterConfigRuleSettings(rules, setting.rules)
    }

    this.ruleSettingsFileCache.set(file.fileRelativePath, rules)
    return rules
  }

  getSanitizedDebugConfig() {
    return sanitizeConfig(this.config)
  }
}

export function sanitizeConfig(
  config: LinterConfig
): Omit<LinterConfig, 'ruleDefinitions'> & { ruleDefinitions?: string[] } {
  return pruneUndefined({
    ...config,
    ruleDefinitions: config.ruleDefinitions?.map(
      (ruleDefinition) => `${ruleDefinition.name} { ... }`
    ),
    llmOptions: pruneUndefined({
      ...config.llmOptions,
      apiKey: config.llmOptions?.apiKey ? '<redacted>' : undefined
    })
  })
}
