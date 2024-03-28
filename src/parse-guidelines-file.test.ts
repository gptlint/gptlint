import fs from 'node:fs/promises'

import { globbySync } from 'globby'
import { assert, expect, test } from 'vitest'

import { parseGuidelinesFile } from './parse-guidelines-file.js'

const validGuidelinesFiles = globbySync('fixtures/guidelines/**/*.md', {
  gitignore: true
})
const invalidGuidelinesFiles = globbySync(
  'fixtures/invalid-guidelines/**/*.md',
  {
    gitignore: true
  }
)

for (const guidelinesFile of validGuidelinesFiles) {
  test(`parseGuidelinesFile - ${guidelinesFile}`, async () => {
    const content = await fs.readFile(guidelinesFile, { encoding: 'utf-8' })
    const rules = await parseGuidelinesFile({
      content,
      filePath: guidelinesFile
    })
    assert(rules.length > 0)
    expect(rules).toMatchSnapshot()
  })
}

for (const guidelinesFile of invalidGuidelinesFiles) {
  test(`parseGuidelinesFile - invalid - ${guidelinesFile}`, async () => {
    const content = await fs.readFile(guidelinesFile, { encoding: 'utf-8' })
    await expect(
      parseGuidelinesFile({
        content,
        filePath: guidelinesFile
      })
    ).rejects.toThrow()
  })
}
