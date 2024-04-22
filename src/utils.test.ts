import path from 'node:path'

import { expect, test } from 'vitest'

import {
  dirname,
  inferBestPossibleCodeFileExtension,
  omit,
  pick,
  resolveGlobFilePatterns
} from './utils.js'

test('inferBestPossibleCodeFileExtension - valid', () => {
  expect(inferBestPossibleCodeFileExtension('js')).toBe('js')
  expect(inferBestPossibleCodeFileExtension('ts')).toBe('ts')
  expect(inferBestPossibleCodeFileExtension('py')).toBe('py')
  expect(inferBestPossibleCodeFileExtension('tsx')).toBe('tsx')
  expect(inferBestPossibleCodeFileExtension('typescript')).toBe('ts')
  expect(inferBestPossibleCodeFileExtension('javascript')).toBe('js')
  expect(inferBestPossibleCodeFileExtension('md')).toBe('md')
  expect(inferBestPossibleCodeFileExtension('markdown')).toBe('md')

  expect(
    inferBestPossibleCodeFileExtension('', { fallbacks: ['javascript'] })
  ).toBe('js')
  expect(
    inferBestPossibleCodeFileExtension('', {
      fallbacks: ['unknown', 'typescript']
    })
  ).toBe('ts')
})

test('inferBestPossibleCodeFileExtension - invalid', () => {
  expect(inferBestPossibleCodeFileExtension('')).toBe(undefined)
  expect(inferBestPossibleCodeFileExtension('dlkjf')).toBe(undefined)
  expect(inferBestPossibleCodeFileExtension(undefined)).toBe(undefined)
  expect(
    inferBestPossibleCodeFileExtension('foo', { fallbacks: ['bar', 'baz'] })
  ).toBe(undefined)
})

test('pick', () => {
  expect(pick({ a: 1, b: 2, c: 3 }, 'a', 'c')).toEqual({ a: 1, c: 3 })
  expect(
    pick({ a: { b: 'foo' }, d: -1, foo: null } as any, 'b', 'foo')
  ).toEqual({ foo: null })
})

test('omit', () => {
  expect(omit({ a: 1, b: 2, c: 3 }, 'a', 'c')).toEqual({ b: 2 })
  expect(
    omit({ a: { b: 'foo' }, d: -1, foo: null } as any, 'b', 'foo')
  ).toEqual({ a: { b: 'foo' }, d: -1 })
})

test('resolveGlobFilePatterns', async () => {
  expect(
    resolveGlobFilePatterns(['src/**/*.test.ts'])
  ).resolves.toMatchSnapshot()

  expect(resolveGlobFilePatterns(['src/**/*.test.ts'])).resolves.toEqual(
    await resolveGlobFilePatterns(['src/**/*\\.test\\.ts'])
  )

  // Ensure that absolute paths are handled correctly
  const res = await resolveGlobFilePatterns([
    path.resolve('src', 'utils.test.ts')
  ])
  expect(res.length).toEqual(1)
  expect(path.basename(res[0]!)).toEqual('utils.test.ts')

  const r = await resolveGlobFilePatterns(['../gptlint/src/**/*.test.ts'], {
    cwd: path.resolve(dirname(), '..')
  })
  expect(r).toBeTruthy()
})
