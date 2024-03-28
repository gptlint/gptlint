import { expect, test } from 'vitest'

import { parseInlineConfig } from './parse-inline-config.js'

test(`parseInlineConfig valid`, () => {
  expect(
    parseInlineConfig({
      file: { fileRelativePath: 'test.ts', content: `/* eslint foo: off */` }
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
        content: `\n\n/** eslint bar-baz: warn, @namespace/id : off **/\n\n`
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
        content: `\n\n/** eslint bar-baz: warn, @namespace/id : off **/\n\n`
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
        content: `/* eslint foo: off */\n/* bar: warn */`
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
        content: `/* eslint foo: off */\n/* eslint bar: warn */`
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
      file: { fileRelativePath: 'test.ts', content: `/* eslint-disable */` }
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
        content: `/* eslint-disable */\n\n/**   eslint-enable  */`
      }
    })
  ).toEqual(undefined)

  expect(
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `/* eslint-disable */\n\n/* eslint-enable */\n\n/* eslint-disable */`
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
      file: { fileRelativePath: 'test.ts', content: `/* eslint foo */` }
    })
  ).toThrow()

  expect(() =>
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `/* eslint foo: unknown */`
      }
    })
  ).toThrow()

  expect(() =>
    parseInlineConfig({
      file: {
        fileRelativePath: 'test.ts',
        content: `\n\n/* eslint foo: off */\n\n/** eslint bar: unknown   **/\n`
      }
    })
  ).toThrow()
})
