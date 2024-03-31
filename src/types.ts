/* eslint-disable no-use-before-define */
import type {
  LLMOptions,
  LinterConfig,
  LinterConfigRuleSetting,
  LinterOptions,
  ResolvedLinterConfig
} from './config.js'

export type {
  LinterConfig,
  LinterConfigRuleSetting,
  LinterOptions,
  LLMOptions,
  ResolvedLinterConfig
}

export type LintRuleErrorConfidence = 'low' | 'medium' | 'high'
export type LintRuleLevel = 'error' | 'warn' | 'off'

export type Rule = {
  name: string
  message: string
  desc: string

  positiveExamples?: RuleExample[]
  negativeExamples?: RuleExample[]

  fixable?: boolean
  level?: LintRuleLevel
  languages?: string[]
  tags?: string[]
  eslint?: string[]
  resources?: string[]
  source?: string
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
}

export type PreLintResult = {
  file: InputFile
  rule: Rule
  config: ResolvedLinterConfig
  cacheKey: any
  lintResult?: LintResult
}

export type ProgressHandlerFn = (opts: {
  progress: number
  message: string
  result: LintResult
}) => void | Promise<void>

export type ProgressHandlerInitFn = (opts: {
  numTasks: number
}) => void | Promise<void>

export type EvalStats = {
  numFiles: number
  numRules: number
  numUnexpectedErrors: number
  numTruePositives: number
  numTrueNegatives: number
  numFalsePositives: number
  numFalseNegatives: number
}
