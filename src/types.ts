import type { ChatModel } from '@dexaai/dexter'
import type { Command } from 'cleye'
import type { TaskAPI, TaskInnerAPI } from 'tasuku'
import type { SetOptional, SetRequired, Simplify } from 'type-fest'

import type { LinterCache } from './cache.js'
import type { ResolvedLinterConfig } from './config.js'
import type { FailedAttemptError } from './errors.js'

export type {
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

export type Rule = {
  // core rule definition
  name: string
  message: string
  desc?: string
  positiveExamples?: RuleExample[]
  negativeExamples?: RuleExample[]

  // optional, user-defined metadata
  fixable?: boolean
  languages?: string[]
  tags?: string[]
  eslint?: string[]
  include?: string[]
  exclude?: string[]
  resources?: string[]
  model?: string
  level: LintRuleLevel // TODO: rename this to `severity`?
  scope: LintRuleScope

  // optional custom functionality for rules scoped to the file-level
  preProcessFile?: PreProcessFileFn
  processFile?: ProcessFileFn
  postProcessFile?: PostProcessFileFn

  // optional custom functionality for rules scoped to the project-level
  preProcessProject?: PreProcessProjectFn
  processProject?: ProcessProjectFn
  postProcessProject?: PostProcessProjectFn

  // internal metadata
  source?: string
}

export type PreProcessFileFnParams = Readonly<{
  file: SourceFile
  rule: Rule
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
  cwd: string
}>
export type PreProcessFileFn = (
  opts: PreProcessFileFnParams
) => MaybePromise<PartialLintResult | undefined>

export type ProcessFileFnParams = Readonly<{
  file: SourceFile
  rule: Rule
  lintResult?: LintResult
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
  cwd: string
}>
export type ProcessFileFn = (
  opts: ProcessFileFnParams
) => MaybePromise<LintResult>

export type PostProcessFileFnParams = SetRequired<
  ProcessFileFnParams,
  'lintResult'
>
export type PostProcessFileFn = (
  opts: ProcessFileFnParams
) => MaybePromise<LintResult>

export type PreProcessProjectFnParams = Readonly<{
  rule: Rule
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
  cwd: string
}>
export type PreProcessProjectFn = (
  opts: PreProcessProjectFnParams
) => MaybePromise<PartialLintResult | undefined>

export type ProcessProjectFnParams = Readonly<{
  rule: Rule
  lintResult?: LintResult
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
  cwd: string
}>
export type ProcessProjectFn = (
  opts: ProcessProjectFnParams
) => MaybePromise<LintResult>

export type PostProcessProjectFnParams = SetRequired<
  ProcessProjectFnParams,
  'lintResult'
>
export type PostProcessProjectFn = (
  opts: ProcessProjectFnParams
) => MaybePromise<LintResult>

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

export type PartialLintError = SetOptional<
  Omit<LintError, 'ruleName' | 'language' | 'model'>,
  'filePath' | 'level'
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
  | 'rule-disabled'
  | 'inline-linter-disabled'

export type LintTask = Simplify<
  {
    scope: LintRuleScope
    rule: Rule
    file?: SourceFile
    config: ResolvedLinterConfig
    cacheKey: string
    group: string
    lintResult?: LintResult
  } & PromiseWithResolvers<unknown> &
    (
      | {
          scope: 'file'
          file: SourceFile
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

export type FileCheckFn = (opts: { file: SourceFile }) => MaybePromise<boolean>

export type FileCheck = {
  desc: string
  fileCheckFn: FileCheckFn
}

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
