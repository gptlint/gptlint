import { expect, test } from 'vitest'

import { isBinaryFile } from './is-binary-file.js'

test('isBinaryFile binary files', async () => {
  expect(isBinaryFile('docs/public/gptlint-logo.png')).resolves.toBe(true)
})

test('isBinaryFile non-binary files', async () => {
  expect(isBinaryFile('src/index.ts')).resolves.toBe(false)
  expect(isBinaryFile('bin/gptlint.ts')).resolves.toBe(false)
  expect(isBinaryFile('readme.md')).resolves.toBe(false)
  expect(isBinaryFile('license')).resolves.toBe(false)
  expect(isBinaryFile('.editorconfig')).resolves.toBe(false)
})
