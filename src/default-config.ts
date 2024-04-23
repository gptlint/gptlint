import type * as types from './types.js'
import * as customRuleDefinitions from '../rules/custom/index.js'
import builtInRules from './built-in-rules.json'
import { defaultFiles } from './constants.js'

const ruleDefinitions: types.RuleDefinition[] = [
  ...(builtInRules as types.RuleDefinition[]),
  ...Object.values(customRuleDefinitions)
]

const ruleSettings: types.LinterConfigRuleSettings = Object.fromEntries(
  ruleDefinitions.map((rule) => [rule.name, 'error'])
)

export const recommendedConfig: types.GPTLintConfig = [
  {
    files: defaultFiles,
    ruleDefinitions,
    rules: ruleSettings
  }
]

// console.log(JSON.stringify(recommendedConfig.map(sanitizeConfig), null, 2))
