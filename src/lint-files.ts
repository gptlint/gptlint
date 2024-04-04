import type { ChatModel } from '@dexaai/dexter'
import pMap from 'p-map'
import plur from 'plur'
import task from 'tasuku'

import type { LinterCache } from './cache.js'
import type * as types from './types.js'
import { lintFile } from './lint-file.js'
import { createLintResult, mergeLintResults } from './lint-result.js'
import { preLintFile } from './pre-lint-file.js'
import { createPromiseWithResolvers, pruneUndefined } from './utils.js'

export async function lintFiles({
  files,
  rules,
  config,
  cache,
  chatModel,
  onProgress,
  onProgressInit
}: {
  files: types.InputFile[]
  rules: types.Rule[]
  config: types.ResolvedLinterConfig
  cache: LinterCache
  chatModel: ChatModel
  onProgress?: types.ProgressHandlerFn
  onProgressInit?: types.ProgressHandlerInitFn
}): Promise<types.LintResult> {
  // TODO: Experiment with different types of file <> rule mappings
  const lintTasks = rules.flatMap((rule) =>
    files.map((file) => ({ file, rule }))
  )
  let lintResult = createLintResult()
  let earlyExitTripped = false
  const warnings: Error[] = []

  // Preprocess the file / rule tasks so we have a clear indication of how many
  // non-cached, non-disabled tasks need to be processed
  const rawLintTasks = (
    await pMap(
      lintTasks,
      async ({ file, rule }) => {
        try {
          const preLintResult = await preLintFile({
            file,
            rule,
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
        concurrency: config.linterOptions.concurrency
      }
    )
  ).filter(Boolean)

  const resolvedLintTasks = rawLintTasks.filter((r) => !r.lintResult)
  const skippedLintTasks = rawLintTasks.filter((r) => r.lintResult)
  const numTasksCached = skippedLintTasks.filter(
    (r) => r.skipReason === 'cached'
  ).length
  const numTasksPrecheck = skippedLintTasks.filter(
    (r) => r.skipReason === 'failed-precheck'
  ).length
  const numTasksDisabled = skippedLintTasks.filter(
    (r) =>
      r.skipReason === 'inline-linter-disabled' ||
      r.skipReason === 'rule-disabled'
  ).length

  console.log(
    'preLintResults',
    pruneUndefined({
      numTasks: resolvedLintTasks.length,
      numTasksCached: numTasksCached || undefined,
      numTasksPrecheck: numTasksPrecheck || undefined,
      numTasksDisabled: numTasksDisabled || undefined
    })
  )
  console.log(
    resolvedLintTasks.map((task) => ({
      file: task.file.fileRelativePath,
      rule: task.rule.name
    }))
  )

  if (config.linterOptions.earlyExit && lintResult.lintErrors.length > 0) {
    earlyExitTripped = true
  }

  if (onProgressInit) {
    await Promise.resolve(
      onProgressInit({ numTasks: resolvedLintTasks.length })
    )
  }

  const lintTaskGroups: Record<string, types.LintTaskGroup> = {}

  for (const lintTask of resolvedLintTasks) {
    const group = lintTask.file.fileRelativePath
    if (!lintTaskGroups[group]) {
      const lintTaskP = createPromiseWithResolvers()

      lintTaskGroups[group] = {
        ...lintTaskP,

        lintTasks: [],
        lintResults: [],

        taskP: undefined,
        innerTask: undefined,

        async init() {
          if (!this.taskP) {
            await new Promise<void>((resolve) => {
              this.taskP = task(`Linting ${group}`, async (innerTask) => {
                this.innerTask = innerTask
                resolve()
                return lintTaskP
              })
            })
          }
        }
      }
    }

    const lintTaskGroup = lintTaskGroups[group]!
    lintTaskGroup.lintTasks.push(lintTask)
  }

  let sortedLintTasks: types.LintTask[] = []
  for (const lintTaskGroup of Object.values(lintTaskGroups)) {
    sortedLintTasks = sortedLintTasks.concat(lintTaskGroup.lintTasks)

    lintTaskGroup.promise = Promise.all(
      lintTaskGroup.lintTasks.map((t) => t.promise)
    )

    lintTaskGroup.promise.then((value) => {
      lintTaskGroup.resolve(value)
      lintTaskGroup.taskP!.then((task) => {
        task.clear()
      })
    }, lintTaskGroup.reject)
  }

  // Loop over each non-cached file / rule task and lint them with the LLM
  // linting engine.
  await pMap(
    sortedLintTasks,
    async (lintTask, index) => {
      if (earlyExitTripped) {
        return
      }

      const { file, rule, cacheKey, config } = lintTask
      const lintTaskGroup = lintTaskGroups[file.fileRelativePath]!
      await lintTaskGroup.init()
      const lintTaskGroupInnerTask = lintTaskGroup.innerTask!

      let taskLintResult: types.LintResult | undefined

      const nestedTask = await lintTaskGroupInnerTask.task(
        rule.name,
        async (task) => {
          try {
            taskLintResult = await lintFile({
              file,
              rule,
              chatModel,
              config,
              retryOptions: {
                retries: 2,
                onFailedAttempt: (err) => {
                  task.setOutput(`Retrying: ${err.message}`)
                }
              }
            })

            if (cacheKey) {
              await cache.set(cacheKey, taskLintResult)
            }

            lintResult = mergeLintResults(lintResult, taskLintResult)

            if (
              config.linterOptions.earlyExit &&
              lintResult.lintErrors.length > 0
            ) {
              earlyExitTripped = true
            }

            if (onProgress) {
              await Promise.resolve(
                onProgress({
                  progress: index / sortedLintTasks.length,
                  message: `Rule "${rule.name}" file "${file.fileRelativePath}"`,
                  result: lintResult
                })
              )
            }

            if (taskLintResult.lintErrors.length > 0) {
              task.setError(
                `found ${taskLintResult.lintErrors.length} lint ${plur(
                  'error',
                  taskLintResult.lintErrors.length
                )}`
              )
            }
          } catch (err: any) {
            const error = new Error(
              `rule "${rule.name}" file "${file.fileRelativePath}" unexpected error: ${err.message}`,
              { cause: err }
            )
            console.warn(error.message)
            warnings.push(error)
            task.setError(err.message)
          }
        }
      )

      if (taskLintResult) {
        if (!taskLintResult!.lintErrors.length) {
          nestedTask.clear()
        }

        lintTaskGroup.lintResults.push(taskLintResult!)
      }

      lintTask.resolve(undefined)
    },
    {
      concurrency: config.linterOptions.concurrency
    }
  )

  lintResult.endedAtMs = Date.now()
  return lintResult
}
