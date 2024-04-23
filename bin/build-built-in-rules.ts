#!/usr/bin/env node
import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import { gracefulExit } from 'exit-hook'
import { globby } from 'globby'
import pMap from 'p-map'

import { parseRuleFilePath } from '../src/parse-rule-file.js'

/**
 * Internal script for pre-parsing built-in rules so they don't have to be
 * loaded and parsed every time the linter is run.
 */
async function main() {
  const destDir = path.join('src')
  const files = await globby('rules/*.md')

  const rules = await pMap(
    files,
    async (file) => {
      const srcPath = path.resolve(file)

      try {
        const rule = await parseRuleFilePath(srcPath)
        return rule
      } catch (err: any) {
        console.error(`Error parsing built-in rule file "${srcPath}":`, err)
        throw err
      }
    },
    {
      concurrency: 16
    }
  )

  rules.sort((a, b) => a.name.localeCompare(b.name))

  const builtInRulesSource = JSON.stringify(rules, null, 2)

  await fs.writeFile(
    path.join(destDir, 'built-in-rules.json'),
    builtInRulesSource,
    { encoding: 'utf8' }
  )
}

try {
  await main()
} catch (err) {
  console.error(err)
  gracefulExit(1)
}
