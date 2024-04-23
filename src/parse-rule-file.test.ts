import fs from 'node:fs/promises'

import { globbySync } from 'globby'
import { assert, expect, test } from 'vitest'

import { parseRuleFile } from './parse-rule-file.js'

const validRuleFiles = globbySync(
  ['fixtures/valid-rules/**/*.md', 'rules/**/*.md', '!rules/readme.md'],
  {
    gitignore: true
  }
)
const invalidRuleFiles = globbySync('fixtures/invalid-rules/**/*.md', {
  gitignore: true
})

for (const ruleFile of validRuleFiles) {
  test(`parseRuleFile - ${ruleFile}`, async () => {
    const content = await fs.readFile(ruleFile, { encoding: 'utf8' })
    const rule = await parseRuleFile({
      content,
      filePath: ruleFile
    })
    assert(rule)
    expect(rule).toMatchSnapshot()
  })
}

for (const ruleFile of invalidRuleFiles) {
  test(`parseRuleFile - invalid - ${ruleFile}`, async () => {
    const content = await fs.readFile(ruleFile, { encoding: 'utf8' })
    await expect(
      parseRuleFile({
        content,
        filePath: ruleFile
      })
    ).rejects.toThrow()
  })
}
