/* eslint-disable no-use-before-define */

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
