import type { ChatModel } from '@dexaai/dexter'
import pMap from 'p-map'

import type * as types from './types.js'
import type { LinterCache } from './cache.js'
import { lintFile } from './lint-file.js'
import { preLintFile } from './pre-lint-file.js'
import { createLintResult, mergeLintResults } from './utils.js'

export async function lintFiles({
  files,
  rules,
  config,
  cache,
  chatModel,
  concurrency = 16,
  onProgress,
  onProgressInit
}: {
  files: types.InputFile[]
  rules: types.Rule[]
  config: types.ResolvedLinterConfig
  cache: LinterCache
  chatModel: ChatModel
  concurrency?: number
  onProgress?: types.ProgressHandlerFn
  onProgressInit?: types.ProgressHandlerInitFn
}): Promise<types.LintResult> {
  // TODO: Add support for different types of file <> rule mappings
  const lintTasks = rules.flatMap((rule) =>
    files.map((file) => ({ file, rule }))
  )
  let lintResult = createLintResult()
  let earlyExitTripped = false
  const warnings: Error[] = []

  // Preprocess the file / rule tasks so our progress bar has a clear indication of
  // how many non-cached tasks need to be handled
  const preLintResults = (
    await pMap(
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
          const error = new Error(
            `rule "${rule.name}" file "${file.fileRelativePath}" unexpected prelint error: ${err.message}`,
            { cause: err }
          )
          console.warn(error.message)
          warnings.push(error)
        }
      },
      {
        concurrency
      }
    )
  ).filter(Boolean)

  const resolvedLintTasks = preLintResults.filter((r) => !r.lintResult)

  console.log(
    'preLintResults',
    {
      numTasks: lintTasks.length,
      numTasksCached: lintTasks.length - resolvedLintTasks.length,
      numTasksTodo: resolvedLintTasks.length
    },
    '\n',
    resolvedLintTasks.map((task) => ({
      file: task.file.fileRelativePath,
      rule: task.rule.name
    }))
  )

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
        const fileLintResult = await lintFile({
          file,
          rule,
          chatModel,
          config
        })

        if (cacheKey) {
          await cache.set(cacheKey, fileLintResult)
        }

        lintResult = mergeLintResults(lintResult, fileLintResult)

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
        const error = new Error(
          `rule "${rule.name}" file "${file.fileRelativePath}" unexpected error: ${err.message}`,
          { cause: err }
        )
        console.warn(error.message)
        warnings.push(error)
      }
    },
    {
      concurrency
    }
  )

  return lintResult
}
