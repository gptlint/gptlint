import path from 'node:path'

import type * as types from './types.js'
import * as customRuleDefinitions from '../rules/custom/index.js'
import { parseRuleFilePath } from './parse-rule-file.js'
import { dirname } from './utils.js'

const builtInRuleDir = path.resolve(dirname(import.meta), '..', 'rules')
const builtInRuleNames = [
  'always-handle-promises',
  'avoid-type-info-in-docs',
  'consistent-identifier-casing',
  'liberal-accept-strict-produce',
  'no-hardcoded-secrets',
  'prefer-array-at-negative-indexing',
  'prefer-loose-array-bounds-checks-in-loops',
  'prefer-types-always-valid-states',
  'react-avoid-class-components',
  'semantic-variable-names',
  'soc2-no-leak-user-data',
  'use-correct-english'
]

const builtInRules = await Promise.all(
  builtInRuleNames.map((ruleName) =>
    parseRuleFilePath(`./${ruleName}.md`, {
      cwd: builtInRuleDir
    })
  )
)

const ruleDefinitions = [
  ...builtInRules,
  ...Object.values(customRuleDefinitions)
]

const ruleSettings: types.LinterConfigRuleSettings = Object.fromEntries(
  ruleDefinitions.map((rule) => [rule.name, 'error'])
)

// TODO: add 'recommended'

export const defaultConfig: types.GPTLintConfig = [
  {
    // include: ['**/*.{js,ts,jsx,tsx,cjs,mjs}'],
    rules: ruleSettings,
    ruleDefinitions
  },
  {
    // include: ['**/*.{md,mdx}'],
    rules: {
      'use-correct-english': 'error'
    }
  }
]

console.log(JSON.stringify(defaultConfig, null, 2))
