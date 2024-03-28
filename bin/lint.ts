import path from 'node:path'

import 'dotenv/config'
import { globby } from 'globby'
import ProgressBar, { type Progress } from 'ts-progress'

import type * as types from '../src/types.js'
import { lintFiles } from '../src/lint-files.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { resolveRules } from '../src/resolve-rules.js'
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

  let rules: types.Rule[]

  try {
    rules = await resolveRules({ cwd, config, concurrency })
  } catch (err: any) {
    console.error(err.message)
    args.showHelp()
    process.exit(1)
  }

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
