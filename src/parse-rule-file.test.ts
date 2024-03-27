import fs from 'node:fs/promises'

import { globbySync } from 'globby'
import { assert, expect, test } from 'vitest'

import { parseRuleFile } from './parse-rule-file.js'

const ruleFiles = globbySync('rules/**/*.md', { gitignore: true })

for (const ruleFile of ruleFiles) {
  test(`parseRuleFile - ${ruleFile}`, async () => {
    const content = await fs.readFile(ruleFile, { encoding: 'utf-8' })
    const rule = await parseRuleFile({
      content,
      filePath: ruleFile
    })
    assert(rule)
    expect(rule).toMatchSnapshot()
  })
}
