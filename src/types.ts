import type { ChatModel } from '@dexaai/dexter'
import type { Command } from 'cleye'
import type { TaskAPI, TaskInnerAPI } from 'tasuku'
import type { SetOptional, SetRequired, Simplify } from 'type-fest'

import type { LinterCache } from './cache.js'
import type { ResolvedLinterConfig } from './config.js'
import type { FailedAttemptError } from './errors.js'
import type { Rule, RuleMetadata } from './rule.js'

export type {
  FullyResolvedLinterConfig,
  GPTLintConfig,
  LinterConfig,
  LinterConfigRuleSetting,
  LinterConfigRuleSettings,
  LinterOptions,
  LLMOptions,
  ResolvedLinterConfig
} from './config.js'

export type MaybePromise<T> = T | Promise<T>

export type LintRuleLevel = 'error' | 'warn' | 'off'
export type LintRuleScope = 'file' | 'project' | 'repo'

export type LintRuleErrorConfidence = 'low' | 'medium' | 'high'

export type RulePreProcessFileFnParams<
  Metadata extends RuleMetadata = RuleMetadata
> = Readonly<{
  file: SourceFile | PartialSourceFile
  rule: Rule<Metadata>
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
  cwd: string
}>
export type RulePreProcessFileFn<Metadata extends RuleMetadata = RuleMetadata> =
  (
    opts: RulePreProcessFileFnParams<Metadata>
  ) => MaybePromise<PartialLintResult | void | undefined>

export type RuleProcessFileFnParams<
  Metadata extends RuleMetadata = RuleMetadata
> = Readonly<{
  file: SourceFile | PartialSourceFile
  rule: Rule<Metadata>
  lintResult?: LintResult
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
  cwd: string
}>
export type RuleProcessFileFn<Metadata extends RuleMetadata = RuleMetadata> = (
  opts: RuleProcessFileFnParams<Metadata>
) => MaybePromise<PartialLintResult | undefined>

export type RulePostProcessFileFnParams<
  Metadata extends RuleMetadata = RuleMetadata
> = SetRequired<RuleProcessFileFnParams<Metadata>, 'lintResult'>
export type RulePostProcessFileFn<
  Metadata extends RuleMetadata = RuleMetadata
> = (
  opts: RuleProcessFileFnParams<Metadata>
) => MaybePromise<PartialLintResult | undefined>

export type RulePreProcessProjectFnParams<
  Metadata extends RuleMetadata = RuleMetadata
> = Readonly<{
  rule: Rule<Metadata>
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
  cwd: string
}>
export type RulePreProcessProjectFn<
  Metadata extends RuleMetadata = RuleMetadata
> = (
  opts: RulePreProcessProjectFnParams<Metadata>
) => MaybePromise<PartialLintResult | void | undefined>

export type RuleProcessProjectFnParams<
  Metadata extends RuleMetadata = RuleMetadata
> = Readonly<{
  rule: Rule<Metadata>
  lintResult?: LintResult
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
  cwd: string
}>
export type RuleProcessProjectFn<Metadata extends RuleMetadata = RuleMetadata> =
  (
    opts: RuleProcessProjectFnParams<Metadata>
  ) => MaybePromise<PartialLintResult | undefined>

export type RulePostProcessProjectFnParams<
  Metadata extends RuleMetadata = RuleMetadata
> = SetRequired<RuleProcessProjectFnParams<Metadata>, 'lintResult'>
export type RulePostProcessProjectFn<
  Metadata extends RuleMetadata = RuleMetadata
> = (
  opts: RuleProcessProjectFnParams<Metadata>
) => MaybePromise<PartialLintResult | undefined>

export type RuleInitFnParams<Metadata extends RuleMetadata = RuleMetadata> =
  Readonly<{
    rule: Rule<Metadata>
    chatModel: ChatModel
    cache: LinterCache
    config: ResolvedLinterConfig
    retryOptions?: RetryOptions
    cwd: string
  }>
export type RuleInitFn<Metadata extends RuleMetadata = RuleMetadata> = (
  opts: RuleInitFnParams<Metadata>
) => MaybePromise<void>

export type RuleExample = {
  code: string
  language?: string
}

export type SourceFile = {
  filePath: string
  fileName: string
  fileRelativePath: string
  content: string
  language: string

  // partial source files only
  ranges?: FileRange[]
  partialContent?: string
}

export type PartialSourceFile = SetRequired<
  SourceFile,
  'partialContent' | 'ranges'
>

export interface FileRange {
  start: {
    line: number
    column?: number // inclusive if present
  }

  end: {
    line: number
    column?: number // exclusive if present
  }
}

export type LintError = {
  ruleName: string
  filePath: string
  language?: string
  model?: string

  // lineStart: number // TODO
  message: string
  level: LintRuleLevel
  codeSnippet?: string
  confidence?: LintRuleErrorConfidence
  reasoning?: string
}

export type PartialLintError = Simplify<
  SetOptional<
    Omit<LintError, 'ruleName' | 'language'>,
    'filePath' | 'level' | 'model'
  >
>

export type LintResult = {
  lintErrors: LintError[]
  skipped?: boolean
  skipReason?: LintSkipReason
  skipDetail?: string

  // model message: TODO: rename this?
  message?: string

  numModelCalls: number
  numModelCallsCached: number

  numPromptTokens: number
  numCompletionTokens: number
  numTotalTokens: number
  totalCost: number

  startedAtMs: number
  endedAtMs?: number
}

export type PartialLintResult = Partial<
  Omit<LintResult, 'lintErrors' | 'startedAtMs' | 'endedAtMs'>
> & {
  lintErrors?: PartialLintError[]
}

export type LintSkipReason =
  | 'cached'
  | 'empty'
  | 'pre-process-file'
  | 'pre-process-project'
  | 'grit-pattern'
  | 'rule-disabled'
  | 'inline-linter-disabled'

export type LintTask = Simplify<
  {
    scope: LintRuleScope
    rule: Rule
    file?: SourceFile | PartialSourceFile
    config: ResolvedLinterConfig
    cacheKey: string
    group: string
    lintResult?: LintResult
  } & PromiseWithResolvers<unknown> &
    (
      | {
          scope: 'file'
          file: SourceFile | PartialSourceFile
        }
      | {
          scope: 'project' | 'repo'
          file: never
        }
    )
>

export type ResolvedLintTask = SetRequired<LintTask, 'lintResult'>

export type LintTaskGroup = {
  lintTasks: LintTask[]
  lintResults: LintResult[]

  taskP: Promise<TaskAPI> | undefined
  innerTask: TaskInnerAPI | undefined
  init(): Promise<void>
} & PromiseWithResolvers<unknown>

export type ProgressHandlerFn = (opts: {
  progress: number
  message: string
  result: LintResult
}) => MaybePromise<void>

export type ProgressHandlerInitFn = (opts: {
  numTasks: number
}) => MaybePromise<void>

export type EvalStats = {
  numFiles: number
  numRules: number
  numUnexpectedErrors: number
  numTruePositives: number
  numTrueNegatives: number
  numFalsePositives: number
  numFalseNegatives: number
}

export type CLIFlags = NonNullable<Command['options']['flags']>

export type RetryOptions = {
  retries: number
  readonly onFailedAttempt?: (error: FailedAttemptError) => MaybePromise<void>
}

export { type Rule, type RuleDefinition } from './rule.js'
