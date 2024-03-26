import fs from 'node:fs/promises'
import path from 'node:path'

import 'dotenv/config'
import { globby } from 'globby'
import pMap from 'p-map'

import type * as types from '../src/types.js'
import { lintFiles } from '../src/linter.js'
import { parseGuidelinesFile } from '../src/parse-guidelines-file.js'
import { resolveLinterConfig } from '../src/resolve-config.js'

async function main() {
  const cwd = process.cwd()
  const concurrency = 16

  const { args, linterConfig: config } = await resolveLinterConfig(
    process.argv,
    { cwd }
  )

  const guidelineFilePaths = (
    await globby(config.guidelineFiles, {
      gitignore: true,
      cwd
    })
  ).map((filePath) => path.join(cwd, filePath))

  const ruleFilePaths = (
    await globby(config.ruleFiles, {
      gitignore: true,
      cwd
    })
  ).map((filePath) => path.join(cwd, filePath))

  const processedGuidelineFilePaths = new Set<string>()
  const processedRuleFilePaths = new Set<string>()
  let rules: types.Rule[] = []

  // Parse any project-specific guideline files
  rules = (
    await pMap(
      guidelineFilePaths,
      async (guidelineFilePath) => {
        try {
          if (processedGuidelineFilePaths.has(guidelineFilePath)) {
            return
          }
          processedGuidelineFilePaths.add(guidelineFilePath)

          const guidelineFileContent = await fs.readFile(
            guidelineFilePath,
            'utf-8'
          )
          const rules = await parseGuidelinesFile(guidelineFileContent)

          // console.log(JSON.stringify(rules, null, 2))
          return rules
        } catch (err: any) {
          console.error(
            `Error parsing guidelines file "${guidelineFilePath}"`,
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
  )
    .filter(Boolean)
    .flat()

  // Parse any project-specific rule files
  rules = rules.concat(
    (
      await pMap(
        ruleFilePaths,
        async (ruleFilePath) => {
          try {
            if (processedRuleFilePaths.has(ruleFilePath)) {
              return
            }
            processedRuleFilePaths.add(ruleFilePath)

            const ruleFileContent = await fs.readFile(ruleFilePath, 'utf-8')
            const rule = await parseRuleFile(ruleFileContent)

            return rule
          } catch (err: any) {
            console.error(
              `Error parsing rule file "${ruleFilePath}"`,
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
    ).filter(Boolean)
  )

  // TODO: validate config.rules against resolved rule names

  const inputFiles = (
    await globby(config.files, {
      gitignore: true,
      ignore: config.ignores,
      cwd
    })
  ).map((filePath) => path.join(cwd, filePath))

  if (config.linterOptions.debugConfig) {
    console.log(
      '\nlogging resolved config and then exiting because `debugConfig` is enabled\n'
    )
    console.log('config', JSON.stringify(config, null, 2))
    console.log('input files', JSON.stringify(inputFiles, null, 2))
    console.log('rules', JSON.stringify(rules, null, 2))
    process.exit(0)
  }

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
