import type { ChatModel } from '@dexaai/dexter'
import type { Command } from 'cleye'
import type { TaskAPI, TaskInnerAPI } from 'tasuku'
import type { SetRequired } from 'type-fest'

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

export type LintRuleErrorConfidence = 'low' | 'medium' | 'high'
export type LintRuleLevel = 'error' | 'warn' | 'off'

export type Rule = {
  // core rule definition
  name: string
  message: string
  desc: string
  positiveExamples?: RuleExample[]
  negativeExamples?: RuleExample[]

  // metadata
  source?: string

  // optional, user-defined metadata
  fixable?: boolean
  level?: LintRuleLevel
  languages?: string[]
  tags?: string[]
  eslint?: string[]
  resources?: string[]
  model?: string
  prechecks?: FileCheck[]

  // optional custom functionality for rules
  preProcessFile?: PreProcessFileFn
  processFile?: ProcessFileFn
  postProcessFile?: PostProcessFileFn
}

export type PreProcessFileFnParams = Readonly<{
  file: SourceFile
  rule: Rule
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
}>
export type PreProcessFileFn = (
  opts: PreProcessFileFnParams
) => MaybePromise<LintTask>

export type ProcessFileFnParams = Readonly<{
  file: SourceFile
  rule: Rule
  lintResult?: LintResult
  chatModel: ChatModel
  cache: LinterCache
  config: ResolvedLinterConfig
  retryOptions?: RetryOptions
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
  filePath: string
  language: string
  model: string

  // lineStart: number // TODO
  ruleName: string
  codeSnippet: string
  confidence: LintRuleErrorConfidence
  reasoning?: string
}

export type LintResult = {
  lintErrors: LintError[]
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

export type LintSkipReason =
  | 'cached'
  | 'empty'
  | 'failed-precheck'
  | 'rule-disabled'
  | 'inline-linter-disabled'

export type LintTask = {
  file: SourceFile
  rule: Rule
  config: ResolvedLinterConfig
  cacheKey: string
  lintResult?: LintResult
  skipReason?: LintSkipReason
  skipDetail?: string
} & PromiseWithResolvers<unknown>

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
