import pMap from 'p-map'
import pRetry from 'p-retry'

import type * as types from './types.js'
import { LinterCache } from './cache.js'
import { createChatModel } from './create-chat-model.js'
import { lintFile } from './lint-file.js'
import { preLintFile } from './pre-lint-file.js'
import { readFiles } from './read-files.js'
import { mergeLintResults } from './utils.js'

export async function lintFiles({
  inputFiles,
  rules,
  config,
  concurrency = 16,
  onProgress,
  onProgressInit
}: {
  inputFiles: string[]
  rules: types.Rule[]
  config: types.ResolvedLinterConfig
  concurrency?: number
  onProgress?: types.ProgressHandlerFn
  onProgressInit?: types.ProgressHandlerInitFn
}): Promise<types.LintResult> {
  const cache = new LinterCache({
    cacheDir: config.linterOptions.cacheDir,
    noCache: config.linterOptions.noCache
  })
  await cache.init()

  const files = await readFiles(inputFiles, { concurrency })

  const chatModel = createChatModel(config)

  // TODO: Add support for different types of file <> rule mappings
  const lintTasks = rules.flatMap((rule) =>
    files.map((file) => ({ file, rule }))
  )
  const foo_bar = 5

  let lintResult: types.LintResult = {
    lintErrors: [],
    numModelCalls: 0,
    numModelCallsCached: 0,
    numPromptTokens: 0,
    numCompletionTokens: 0,
    numTotalTokens: 0,
    totalCost: 0
  }
  let earlyExitTripped = false

  // Preprocess the file / rule tasks so our progress bar has a clear indication of
  // how many non-cached tasks need to be handled
  const preLintResults = await pMap(
    lintTasks,
    async ({ file, rule }) => {
      try {
        const preLintResult = await preLintFile({
          file,
          rule,
          chatModel,
          cache,
          config
        })

        if (preLintResult.lintResult) {
          lintResult = mergeLintResults(lintResult, preLintResult.lintResult)
        }

        return preLintResult
      } catch (err: any) {
        throw new Error(
          `Error: rule "${rule.name}" file "${file.fileRelativePath}" unexpected error: ${err.message}`,
          { cause: err }
        )
      }
    },
    {
      concurrency
    }
  )

  const resolvedLintTasks = preLintResults.filter((r) => !r.lintResult)

  if (config.linterOptions.earlyExit && lintResult.lintErrors.length) {
    earlyExitTripped = true
  }

  if (onProgressInit) {
    await Promise.resolve(
      onProgressInit({ numTasks: resolvedLintTasks.length })
    )
  }

  // Loop over each non-cached file / rule task and lint then with the LLM
  // linting engine and a capped max concurrency
  await pMap(
    resolvedLintTasks,
    async ({ file, rule, cacheKey, config }, index) => {
      if (earlyExitTripped) {
        return
      }

      try {
        const lintResultFile = await pRetry(
          () =>
            lintFile({
              file,
              rule,
              chatModel,
              cache,
              cacheKey,
              config
            }),
          {
            retries: 2
          }
        )

        lintResult = mergeLintResults(lintResult, lintResultFile)

        if (config.linterOptions.earlyExit && lintResult.lintErrors.length) {
          earlyExitTripped = true
        }

        if (onProgress) {
          await Promise.resolve(
            onProgress({
              progress: index / resolvedLintTasks.length,
              message: `Rule "${rule.name}" file "${file.fileRelativePath}"`,
              result: lintResult
            })
          )
        }
      } catch (err: any) {
        throw new Error(
          `Error: rule "${rule.name}" file "${file.fileRelativePath}" unexpected error: ${err.message}`,
          { cause: err }
        )
      }
    },
    {
      concurrency
    }
  )

  return lintResult
}
