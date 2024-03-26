/* eslint-disable no-use-before-define */

export type LintRuleErrorConfidence = 'low' | 'medium' | 'high'

export type Rule = {
  name: string
  message: string
  desc: string

  positiveExamples?: RuleExample[]
  negativeExamples?: RuleExample[]

  source: string
}

export type RuleExample = {
  code: string
  language?: string
}

export type ConfigRule = 'error' | 'warn' | 'off'

export type Config = {
  rules: Record<string, ConfigRule>
}

export type InputFile = {
  filePath: string
  fileName: string
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
