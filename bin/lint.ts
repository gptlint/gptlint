#!/usr/bin/env node
import 'dotenv/config'
import { gracefulExit } from 'exit-hook'
import plur from 'plur'
import ProgressBar, { type Progress } from 'ts-progress'

import type * as types from '../src/types.js'
import { createLinterCache } from '../src/cache.js'
import { createChatModel } from '../src/create-chat-model.js'
import { lintFiles } from '../src/lint-files.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { resolveFiles } from '../src/resolve-files.js'
import { resolveRules } from '../src/resolve-rules.js'
import { logDebugConfig, logDebugStats } from '../src/utils.js'

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

  let files: types.InputFile[]
  let rules: types.Rule[]

  try {
    ;[files, rules] = await Promise.all([
      resolveFiles({ cwd, config, concurrency }),
      resolveRules({ cwd, config, concurrency })
    ])
  } catch (err: any) {
    console.error(err.message)
    args.showHelp()
    return gracefulExit(1)
  }

  if (config.linterOptions.debugConfig) {
    logDebugConfig({ files, rules, config })
    return gracefulExit(0)
  }

  const chatModel = createChatModel(config)
  const cache = await createLinterCache(config)

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
    logDebugStats({ lintResult, config })
  }

  if (lintResult.lintErrors.length > 0) {
    console.log(
      `\nlint errors:`,
      JSON.stringify(lintResult.lintErrors, null, 2)
    )

    console.log(
      `\nfound ${lintResult.lintErrors.length} lint ${plur(
        'error',
        lintResult.lintErrors.length
      )}`
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
