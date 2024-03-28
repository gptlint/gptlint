import fs from 'node:fs/promises'
import path from 'node:path'

import 'dotenv/config'
import { globby } from 'globby'
import pMap from 'p-map'
import ProgressBar, { type Progress } from 'ts-progress'

import type * as types from '../src/types.js'
import { lintFiles } from '../src/lint-files.js'
import { parseGuidelinesFile } from '../src/parse-guidelines-file.js'
import { parseRuleFile } from '../src/parse-rule-file.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { pick } from '../src/utils.js'

/**
 * Main CLI entrypoint.
 */
async function main() {
  const cwd = process.cwd()
  const concurrency = 16

  const { args, linterConfig: config } = await resolveLinterCLIConfig(
    process.argv,
    { cwd }
  )

  const guidelineFilePaths = await globby(config.guidelineFiles, {
    gitignore: true,
    cwd
  })

  const ruleFilePaths = await globby(config.ruleFiles, {
    gitignore: true,
    cwd
  })

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

          const guidelineFilePathAbsolute = path.join(cwd, guidelineFilePath)
          const guidelineFileContent = await fs.readFile(
            guidelineFilePathAbsolute,
            'utf-8'
          )

          const rules = await parseGuidelinesFile({
            content: guidelineFileContent,
            filePath: guidelineFilePath
          })

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

            if (processedGuidelineFilePaths.has(ruleFilePath)) {
              throw new Error(
                'File cannot be included as both a guidelines markdown file and an individual rule markdown file'
              )
            }

            const ruleFilePathAbsolute = path.join(cwd, ruleFilePath)
            const ruleFileContent = await fs.readFile(
              ruleFilePathAbsolute,
              'utf-8'
            )
            const rule = await parseRuleFile({
              content: ruleFileContent,
              filePath: ruleFilePath
            })

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

  const processedRules = new Set<string>()

  // TODO: validate rules for duplicates and malformed rules
  for (const rule of rules) {
    if (processedRules.has(rule.name)) {
      console.error(`Duplicate rule found "${rule.name}"`)
      args.showHelp()
      process.exit(1)
    }

    processedRules.add(rule.name)

    // TODO: validate rule
  }

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
      '\nlogging resolved config and then exiting because `debugConfig` is enabled'
    )
    console.log('\nconfig', JSON.stringify(config, null, 2))
    console.log('\ninput files', JSON.stringify(inputFiles, null, 2))
    console.log('\nrules', JSON.stringify(rules, null, 2))
    process.exit(0)
  }

  if (config.rules) {
    // Remove rules which have been disabled in the config
    rules = rules.filter((rule) => config.rules[rule.name] !== 'off')
  }

  let progressBar: Progress | undefined

  const lintResult = await lintFiles({
    inputFiles,
    rules,
    config,
    concurrency,
    onProgressInit: ({ numTasks }) => {
      progressBar =
        config.linterOptions.debug || numTasks <= 0
          ? undefined
          : ProgressBar.create({
              total: numTasks,
              updateFrequency: 10
            })
    },
    onProgress: () => {
      progressBar?.update()
    }
  })

  progressBar?.done()

  if (config.linterOptions.debugStats) {
    console.log(
      `\nLLM stats; total cost $${(lintResult.totalCost / 100).toFixed(2)}`,
      pick(
        lintResult,
        'numModelCalls',
        'numModelCallsCached',
        'numPromptTokens',
        'numCompletionTokens',
        'numTotalTokens'
      )
    )
  }

  if (lintResult.lintErrors.length > 0) {
    console.log(
      '\nlint errors:',
      JSON.stringify(lintResult.lintErrors, null, 2)
    )
    process.exit(1)
  } else {
    console.log('\nno lint errors 🎉')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
