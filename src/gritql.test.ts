import path from 'node:path'

import { expect, test } from 'vitest'

import { resolveGritQLPattern } from './gritql.js'
import { readSourceFiles } from './resolve-files.js'
import { dirname } from './utils.js'

test('', async () => {
  const files = await readSourceFiles([
    path.resolve(dirname(), './constants.ts')
  ])
  const filesMap = await resolveGritQLPattern('identifier', {
    files
  })

  expect(filesMap.size).toEqual(1)
  const file = filesMap.get(files[0]?.filePath!)!
  expect(file).toBeTruthy()
  expect(file.partialContent).toBeTruthy()
  expect(file.partialContent).toMatchSnapshot()
})
