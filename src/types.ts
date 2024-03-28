/* eslint-disable no-use-before-define */

export type {
  LinterConfig,
  LinterConfigOptions,
  LinterConfigRuleSetting,
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

  fixable?: boolean
  level?: LintRuleLevel
  languages?: string[]
  tags?: string[]
  eslint?: string[]
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

export type ProgressHandlerFn = (opts: {
  progress: number
  message: string
  result: LintResult
}) => void | Promise<void>
