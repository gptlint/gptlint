import fs from 'node:fs/promises'
import path from 'node:path'

import 'dotenv/config'
import { globby } from 'globby'
import pMap from 'p-map'

import type * as types from '../src/types.js'
import { lintFiles } from '../src/linter.js'
import { parseCLIConfig } from '../src/parse-cli-config.js'
import { parseGuidelines } from '../src/parse-guidelines.js'

async function main() {
  const cwd = process.cwd()
  const concurrency = 16

  const { args, linterConfig: config } = await parseCLIConfig(process.argv)

  const guidelineFilePaths = (
    await globby(config.guidelineFiles, {
      gitignore: true,
      cwd
    })
  ).map((filePath) => path.join(cwd, filePath))

  let rules: types.Rule[] = []

  rules = (
    await pMap(
      guidelineFilePaths,
      async (guidelinesFilePath) => {
        try {
          const rulesFile = await fs.readFile(guidelinesFilePath, 'utf-8')
          const rules = await parseGuidelines(rulesFile)

          // console.log(JSON.stringify(rules, null, 2))
          return rules
        } catch (err: any) {
          console.error(
            `Error parsing guidelines file "${guidelinesFilePath}"`,
            err.message
          )
          args.showHelp()
          process.exit(1)
        }
      },
      {
        concurrency
      }
    )
  ).flat()

  const inputFiles = (
    await globby(config.files, {
      gitignore: true,
      ignore: config.ignores,
      cwd
    })
  ).map((filePath) => path.join(cwd, filePath))

  const lintErrors = await lintFiles({
    inputFiles,
    rules,
    config,
    concurrency
  })

  if (lintErrors.length > 0) {
    console.log('\nlint errors:', JSON.stringify(lintErrors, null, 2))
    process.exit(1)
  } else {
    console.log('\nno lint errors – huzzah!')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
