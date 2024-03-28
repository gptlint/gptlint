import { expect, test } from 'vitest'

import { parseInlineConfig } from './parse-inline-config.js'

test(`parseInlineConfig valid`, () => {
  expect(
    parseInlineConfig({
      file: { fileRelativePath: 'test.ts', content: `/* gptlint foo: off */` }
    })
  ).toEqual({
    rules: {
      foo: 'off'
    }
  })

  expect(
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `\n\n/** gptlint bar-baz: warn, @namespace/id : off **/\n\n`
      }
    })
  ).toEqual({
    rules: {
      'bar-baz': 'warn',
      '@namespace/id': 'off'
    }
  })

  expect(
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `\n\n/** gptlint bar-baz: warn, @namespace/id : off **/\n\n`
      }
    })
  ).toEqual({
    rules: {
      'bar-baz': 'warn',
      '@namespace/id': 'off'
    }
  })

  expect(
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `/* gptlint foo: off */\n/* bar: warn */`
      }
    })
  ).toEqual({
    rules: {
      foo: 'off'
    }
  })

  expect(
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `/* gptlint foo: off */\n/* gptlint bar: warn */`
      }
    })
  ).toEqual({
    rules: {
      foo: 'off',
      bar: 'warn'
    }
  })
})

test(`parseInlineConfig disable`, () => {
  expect(
    parseInlineConfig({
      file: { fileRelativePath: 'test.ts', content: `/* gptlint-disable */` }
    })
  ).toEqual({
    linterOptions: {
      disabled: true
    }
  })

  expect(
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `/* gptlint-disable */\n\n/**   gptlint-enable  */`
      }
    })
  ).toEqual(undefined)

  expect(
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `/* gptlint-disable */\n\n/* gptlint-enable */\n\n/* gptlint-disable */`
      }
    })
  ).toEqual({
    linterOptions: {
      disabled: true
    }
  })
})

test(`parseInlineConfig invalid`, () => {
  expect(() =>
    parseInlineConfig({
      file: { fileRelativePath: 'test.ts', content: `/* gptlint foo */` }
    })
  ).toThrow()

  expect(() =>
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `/* gptlint foo: unknown */`
      }
    })
  ).toThrow()

  expect(() =>
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `\n\n/* gptlint foo: off */\n\n/** gptlint bar: unknown   **/\n`
      }
    })
  ).toThrow()
})
