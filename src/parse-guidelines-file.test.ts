import fs from 'node:fs/promises'

import { globbySync } from 'globby'
import { assert, expect, test } from 'vitest'

import { parseGuidelinesFile } from './parse-guidelines-file.js'

const guidelinesFiles = globbySync('fixtures/guidelines/**/*.md', {
  gitignore: true
})

for (const guidelinesFile of guidelinesFiles) {
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
