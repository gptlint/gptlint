import 'dotenv/config'
import { gracefulExit } from 'exit-hook'
import { globby } from 'globby'
import ProgressBar, { type Progress } from 'ts-progress'

import type * as types from '../src/types.js'
import { LinterCache } from '../src/cache.js'
import { createChatModel } from '../src/create-chat-model.js'
import { lintFiles } from '../src/lint-files.js'
import { readFiles } from '../src/read-files.js'
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
    return gracefulExit(1)
  }

  const inputFiles = await globby(config.files, {
    gitignore: true,
    ignore: config.ignores,
    cwd
  })

  if (config.linterOptions.debugConfig) {
    console.log(
      '\nlogging resolved config and then exiting because `debugConfig` is enabled'
    )
    console.log('\nconfig', JSON.stringify(config, null, 2))
    console.log('\ninput files', JSON.stringify(inputFiles, null, 2))
    console.log('\nrules', JSON.stringify(rules, null, 2))
    return gracefulExit(0)
  }

  const files = await readFiles(inputFiles, { concurrency })
  const chatModel = createChatModel(config)
  const cache = new LinterCache({
    cacheDir: config.linterOptions.cacheDir,
    noCache: config.linterOptions.noCache
  })
  await cache.init()

  let progressBar: Progress | undefined

  const lintResult = await lintFiles({
    files,
    rules,
    config,
    cache,
    chatModel,
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
      {
        model: config.llmOptions.model,
        ...pick(
          lintResult,
          'numModelCalls',
          'numModelCallsCached',
          'numPromptTokens',
          'numCompletionTokens',
          'numTotalTokens'
        )
      }
    )
  }

  if (lintResult.lintErrors.length > 0) {
    console.log(
      '\nlint errors:',
      JSON.stringify(lintResult.lintErrors, null, 2)
    )
    return gracefulExit(1)
  } else {
    console.log('\nno lint errors 🎉')
    return gracefulExit(0)
  }
}

main().catch((err) => {
  console.error('Unexpected error', err)
  return gracefulExit(1)
})
