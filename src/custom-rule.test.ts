/* gptlint prefer-fetch-over-axios: off */
import { assert, expect, test } from 'vitest'

import type * as types from './types.js'
import customRule from '../.gptlint/custom/prefer-fetch-over-axios.js'
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

  expect(
    rule.preProcessFile!({
      file: {
        content: 'import axios from "axios"'
      }
    })
  ).resolves.toEqual(undefined)

  expect(
    rule.preProcessFile!({
      file: {
        content: 'import foo from "bar"\n\n'
      }
    })
  ).resolves.toEqual({ lintErrors: [] })

  // console.log(rule)
})
