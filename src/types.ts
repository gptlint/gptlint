/* eslint-disable no-use-before-define */

export type * from './config.js'

export type LintRuleErrorConfidence = 'low' | 'medium' | 'high'

export type Rule = {
  name: string
  message: string
  desc: string

  positiveExamples?: RuleExample[]
  negativeExamples?: RuleExample[]
}

export type RuleExample = {
  code: string
  language?: string
}

export type InputFile = {
  filePath: string
  fileName: string
  relativeFilePath: string
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
