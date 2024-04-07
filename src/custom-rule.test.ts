import { assert, expect, test } from 'vitest'

import type * as types from './types.js'
import customRule from '../rules/prefer-fetch-over-axios.js'
import { parseLinterConfig } from './config.js'

test('custom rule - prefer-fetch-over-axios', async () => {
  assert(customRule.preProcessFile)

  const rawLinterConfig: Partial<types.LinterConfig> = {
    ruleDefinitions: [customRule]
  }

  const linterConfig = parseLinterConfig(rawLinterConfig)
  assert(linterConfig)
  expect(linterConfig.ruleDefinitions?.length).toBe(1)

  const rule = linterConfig.ruleDefinitions?.[0]!
  expect(rule).toBeTruthy()
  expect(rule.preProcessFile).toBeTruthy()
  expect(rule).toMatchSnapshot()

  console.log(rule)
})
