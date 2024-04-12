import { z } from 'zod'

import type * as types from './types.js'
import { isValidRuleName } from './utils.js'

export type RuleMetadata<K extends string = string, V = any> = Record<K, V>

export type RuleDefinition<Metadata extends RuleMetadata = RuleMetadata> = {
  // core rule definition
  name: string
  title: string
  description?: string
  positiveExamples?: types.RuleExample[]
  negativeExamples?: types.RuleExample[]
  level: types.LintRuleLevel
  scope: types.LintRuleScope

  // optional metadata
  fixable?: boolean
  cacheable?: boolean
  languages?: string[]
  tags?: string[]
  eslint?: string[]
  include?: string[]
  exclude?: string[]
  resources?: string[]
  model?: string

  // optional custom functionality for rules scoped to the file-level
  preProcessFile?: types.RulePreProcessFileFn<Metadata>
  processFile?: types.RuleProcessFileFn<Metadata>
  postProcessFile?: types.RulePostProcessFileFn<Metadata>

  // optional custom functionality for rules scoped to the project-level
  preProcessProject?: types.RulePreProcessProjectFn<Metadata>
  processProject?: types.RuleProcessProjectFn<Metadata>
  postProcessProject?: types.RulePostProcessProjectFn<Metadata>

  init?: types.RuleInitFn<Metadata>
}

export type Rule<Metadata extends RuleMetadata = RuleMetadata> =
  RuleDefinition<Metadata> & {
    // internal metadata
    source: string
    metadata: Metadata
  }

export const RuleDefinitionExampleSchema = z
  .object({
    code: z.string().describe('Example code.'),

    language: z
      .string()
      .optional()
      .describe('Language of the example code snippet.')
  })
  .strict()

export const RuleDefinitionSchema = z
  .object({
    name: z
      .string()
      .refine((name) => isValidRuleName(name))
      .describe(
        "Primary identifier for the rule. Uses lowercase kebab-case. Examples: 'consistent-identifier-casing' and '@foo/bar'."
      ),

    title: z
      .string()
      .describe(
        'A short, human-readable title for the rule. Defaults to the name if not set.'
      ),

    description: z
      .string()
      .optional()
      .describe(
        "Longer description of the rule which is passed to the linting engine's LLM as part of the rule's prompt. Accepts Markdown."
      ),

    positiveExamples: z
      .array(RuleDefinitionExampleSchema)
      .optional()
      .describe('Example code snippets which correctly conform to the rule.'),

    negativeExamples: z
      .array(RuleDefinitionExampleSchema)
      .optional()
      .describe('Example code snippets which violate to the rule.'),

    fixable: z
      .boolean()
      .optional()
      .describe('Whether or not this rule is auto-fixable.'),

    cacheable: z
      .boolean()
      .optional()
      .describe('Whether or not this rule should be cached.'),

    level: z
      .enum(['off', 'warn', 'error'])
      .optional()
      .default('error')
      .describe('Default rule severity.'),

    scope: z
      .enum(['file', 'project', 'repo'])
      .optional()
      .default('file')
      .describe('Granularity at which this rule is applied.'),

    languages: z
      .array(z.string())
      .optional()
      .describe(
        'Programming languages this rule should be restricted to. If empty, this rule will apply to all languages.'
      ),

    tags: z
      .array(z.string())
      .optional()
      .describe(
        'An optional array of tags / labels to associate with this rule.'
      ),

    eslint: z
      .array(z.string())
      .optional()
      .describe(
        'An optional array of `eslint` rule identifiers which are related to this rule.'
      ),

    resources: z
      .array(z.string())
      .optional()
      .describe(
        "An optional array of URLs which give more detail around this rule's intent."
      ),

    model: z
      .string()
      .optional()
      .describe(
        "Specific model to use for this rule. Useful for using a fine-tuned model which is specfic to a single rule. If a `model` is given, it will override the general config's `model` and `weakModel` when enforcing this rule with the built-in LLM-based linting engine."
      ),

    exclude: z
      .array(z.string())
      .optional()
      .describe(
        'An optional array of file glob patterns to ignore when enforcing this rule.'
      ),

    include: z
      .array(z.string())
      .optional()
      .describe(
        'An optional array of file glob patterns to include when enforcing this rule. If not specified, will operate on all input source files not excluded by `exclude`.'
      ),

    preProcessFile: z
      .function(z.tuple([z.any()]), z.any())
      .optional()
      .describe(
        'Optional pre-processing linter logic specific to this rule. Will be run after the built-in pre-processing logic which handles caching and validation.'
      ),

    processFile: z
      .function(z.tuple([z.any()]), z.any())
      .optional()
      .describe(
        "Optional file processing / linting logic specific to this rule. If provided, this will **override** the default LLM-based file linting engine and is intended to be an escape hatch for fully customizing the linting logic for rules which aren't a good fit for LLM-based linting. If you still want to use the built-in LLM-based linting and just want to customize it's functionality, consider using `preProcessFile` or `postProcessFile` instead."
      ),

    postProcessFile: z
      .function(z.tuple([z.any()]), z.any())
      .optional()
      .describe(
        'Optional post-processing linter logic specific to this rule. Will be run after the built-in post-processing logic. Useful for customizing the linting results in a rule-specific way such as pruning common false positives.'
      ),

    preProcessProject: z
      .function(z.tuple([z.any()]), z.any())
      .optional()
      .describe(
        'Optional pre-processing linter logic specific to this rule. Will be run after the built-in pre-processing logic which handles caching and validation.'
      ),

    processProject: z
      .function(z.tuple([z.any()]), z.any())
      .optional()
      .describe(
        'Optional project processing / linting logic specific to this rule.'
      ),

    postProcessProject: z
      .function(z.tuple([z.any()]), z.any())
      .optional()
      .describe(
        'Optional post-processing linter logic specific to this rule. Will be run after the built-in post-processing logic. Useful for customizing the linting results in a rule-specific way such as pruning common false positives.'
      ),

    source: z.string().optional()
  })
  .passthrough()
