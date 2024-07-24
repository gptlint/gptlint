import { expect, test } from 'vitest'

import { parseLinterConfig } from './config.js'

test('parseLinterConfig - valid', () => {
  expect(parseLinterConfig({})).toMatchSnapshot()
  expect(
    parseLinterConfig({
      ruleFiles: ['rules/**/*.md'],
      llmOptions: {
        model: 'gpt-4-turbo-preview',
        weakModel: 'gpt-4o-mini'
      }
    })
  ).toMatchSnapshot()

  expect(
    parseLinterConfig({
      files: ['src/**/*.{ts,tsx,js,jsx}'],
      llmOptions: {
        apiBaseUrl: 'https://openrouter.ai/api/v1',
        model: 'anthropic/claude-3-opus:beta',
        weakModel: 'anthropic/claude-3-haiku:beta',
        kyOptions: {
          headers: {
            'HTTP-Referer': 'https://gptlint.dev',
            'X-Title': 'gptlint'
          }
        }
      }
    })
  ).toMatchSnapshot()
})

test('parseLinterConfig - invalid', () => {
  expect(() => parseLinterConfig({ unknown: true } as any)).toThrow()
  expect(() =>
    parseLinterConfig({
      files: [],
      llmOptions: { model: false }
    } as any)
  ).toThrow()
})
