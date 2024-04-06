import type { Command } from 'cleye'
import type { TaskAPI, TaskInnerAPI } from 'tasuku'

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

export type LintRuleErrorConfidence = 'low' | 'medium' | 'high'
export type LintRuleLevel = 'error' | 'warn' | 'off'

export type Rule = {
  name: string
  message: string
  desc: string

  positiveExamples?: RuleExample[]
  negativeExamples?: RuleExample[]

  source?: string

  // metadata
  fixable?: boolean
  level?: LintRuleLevel
  languages?: string[]
  tags?: string[]
  eslint?: string[]
  resources?: string[]
  model?: string
  prechecks?: FileCheck[]
}

export type RuleExample = {
  code: string
  language?: string
}

export type InputFile = {
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
  file: InputFile
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

export type MaybePromise<T> = T | Promise<T>

export type ProgressHandlerFn = (opts: {
  progress: number
  message: string
  result: LintResult
}) => MaybePromise<void>

export type ProgressHandlerInitFn = (opts: {
  numTasks: number
}) => MaybePromise<void>

export type FileCheckFn = (opts: { file: InputFile }) => MaybePromise<boolean>

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
