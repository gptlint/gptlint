import { ChatModel } from '@dexaai/dexter'
import pMap from 'p-map'
import pRetry from 'p-retry'

import type * as types from './types.js'
import { LinterCache } from './cache.js'
import { lintFile } from './lint-file.js'
import { readFiles } from './read-files.js'

export async function lintFiles({
  inputFiles,
  rules,
  config,
  concurrency = 16
}: {
  inputFiles: string[]
  rules: types.Rule[]
  config: types.ResolvedLinterConfig
  concurrency?: number
}): Promise<types.LintResult> {
  const cache = new LinterCache({
    cacheDir: config.linterOptions.cacheDir,
    noCache: config.linterOptions.noCache
  })
  await cache.init()

  const files = await readFiles(inputFiles, { concurrency })

  const chatModel = new ChatModel({
    params: {
      model: config.linterOptions.model,
      temperature: config.linterOptions.temperature
    },
    debug: config.linterOptions.debugModel
  })

  if (config.rules) {
    // Remove rules which have been disabled in the config
    rules = rules.filter((rule) => config.rules[rule.name] !== 'off')
  }

  // TODO: Add support for different types of file <> rule mappings
  const lintTasks = rules.flatMap((rule) =>
    files.map((file) => ({ file, rule }))
  )

  const lintResult: types.LintResult = {
    lintErrors: [],
    numModelCalls: 0,
    numModelCallsCached: 0,
    numPromptTokens: 0,
    numCompletionTokens: 0,
    numTotalTokens: 0,
    totalCost: 0
  }
  let earlyExitTripped = false

  await pMap(
    lintTasks,
    async ({ file, rule }) => {
      try {
        if (earlyExitTripped) {
          return []
        }

        const lintResultFile = await pRetry(
          () => lintFile({ file, rule, chatModel, cache, config }),
          {
            retries: 2
          }
        )

        lintResult.lintErrors = lintResult.lintErrors.concat(
          lintResultFile.lintErrors
        )
        lintResult.numModelCalls += lintResultFile.numModelCalls
        lintResult.numModelCallsCached += lintResultFile.numModelCallsCached
        lintResult.numPromptTokens += lintResultFile.numPromptTokens
        lintResult.numCompletionTokens += lintResultFile.numCompletionTokens
        lintResult.numTotalTokens += lintResultFile.numTotalTokens
        lintResult.totalCost += lintResultFile.totalCost

        if (lintResult.lintErrors.length && config.linterOptions.earlyExit) {
          earlyExitTripped = true
        }
      } catch (err: any) {
        const message = `Error: rule "${rule.name}" file "${file.fileRelativePath}" unexpected error: ${err.message}`
        console.error(message)
        throw new Error(message, { cause: err })
      }
    },
    {
      concurrency
    }
  )

  return lintResult
}
