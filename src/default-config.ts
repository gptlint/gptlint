import path from 'node:path'

import type * as types from './types.js'
import * as ruleDefinitions from '../rules/custom/index.js'
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
  'prefer-fetch-over-axios',
  'react-avoid-class-components',
  'semantic-variable-names',
  'soc2-no-leak-user-data',
  'use-correct-english'
]
const builtInRuleSettings: types.LinterConfigRuleSettings = Object.fromEntries(
  builtInRuleNames.map((rule) => [rule, 'error'])
)

const builtInRules = await Promise.all(
  builtInRuleNames.map((ruleName) =>
    parseRuleFilePath(`./${ruleName}.md`, {
      cwd: builtInRuleDir
    })
  )
)

// TODO: add 'recommended'

export const defaultConfig: types.GPTLintConfig = [
  {
    // include: ['**/*.{js,ts,jsx,tsx,cjs,mjs}'],
    rules: builtInRuleSettings,
    ruleDefinitions: {
      ...builtInRules,
      ...Object.values(ruleDefinitions)
    }
  },
  {
    // include: ['**/*.{md,mdx}'],
    rules: {
      'use-correct-english': 'error'
    }
  }
]
