import type { ChatModel } from '@dexaai/dexter'
import pMap from 'p-map'
import plur from 'plur'
import task from 'tasuku'

import type { LinterCache } from './cache.js'
import type * as types from './types.js'
import { lintFile } from './lint-file.js'
import { createLintResult, mergeLintResults } from './lint-result.js'
import { preProcessFile } from './pre-process-file.js'
import {
  assert,
  createPromiseWithResolvers,
  omit,
  pruneUndefined
} from './utils.js'

export async function lintFiles({
  files,
  rules,
  config,
  cache,
  chatModel,
  retryOptions = {
    retries: 2
  },
  onProgress,
  onProgressInit
}: {
  files: types.SourceFile[]
  rules: types.Rule[]
  config: types.ResolvedLinterConfig
  cache: LinterCache
  chatModel: ChatModel
  retryOptions?: types.RetryOptions
  onProgress?: types.ProgressHandlerFn
  onProgressInit?: types.ProgressHandlerInitFn
}): Promise<types.LintResult> {
  // TODO: Experiment with different types of file <> rule mappings.
  const lintTasks = rules.flatMap((rule) =>
    files.map((file) => ({ file, rule }))
  )

  let lintResult = createLintResult()
  let earlyExitTripped = false
  const warnings: Error[] = []

  // Preprocess the file / rule tasks so we have a clear indication of how many
  // non-cached, non-disabled tasks need to be processed.
  const rawLintTasks: types.LintTask[] = (
    await pMap(
      lintTasks,
      async ({ file, rule }) => {
        try {
          // Always run the built-in pre-processing logic for caching and validation
          // purposes. Then run any custom, rule-specific pre-processing logic if
          // it exists.
          const fileLintTask = await preProcessFile({
            rule,
            file,
            chatModel,
            cache,
            config,
            retryOptions
          })

          if (fileLintTask.lintResult) {
            lintResult = mergeLintResults(lintResult, fileLintTask.lintResult)

            return fileLintTask
          }

          if (rule.preProcessFile) {
            const partialFileLintResults = await Promise.resolve(
              rule.preProcessFile({
                rule,
                file,
                chatModel,
                cache,
                config,
                retryOptions
              })
            )

            if (partialFileLintResults) {
              if (
                partialFileLintResults.lintErrors ||
                partialFileLintResults.skipped
              ) {
                // Convert partial lint result to full lint result.
                fileLintTask.lintResult = createLintResult({
                  ...partialFileLintResults,
                  skipped: true,
                  skipReason: 'pre-process-file',
                  lintErrors: partialFileLintResults.lintErrors?.map(
                    (partialLintError) => ({
                      model:
                        rule.model ??
                        config.llmOptions.weakModel ??
                        config.llmOptions.model,
                      ...partialLintError,
                      ruleName: rule.name,
                      filePath: file.fileRelativePath,
                      language: file.language
                    })
                  )
                })

                return fileLintTask
              } else {
                // Preprocessing added some metadata to the lint result, but didn't
                // preempt the rest of the linting process.
                fileLintTask.lintResult = createLintResult(
                  omit(partialFileLintResults, 'lintErrors')
                )
              }
            }
          }

          return fileLintTask
        } catch (err: any) {
          const error = new Error(
            `rule "${rule.name}" file "${file.fileRelativePath}" unexpected preProcess error: ${err.message}`,
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

  const outstandingLintTasks = rawLintTasks.filter(
    (r) => !r.lintResult?.skipped && !r.lintResult?.lintErrors
  )
  const skippedLintTasks = rawLintTasks.filter(
    (r) => r.lintResult?.skipped || r.lintResult?.lintErrors
  ) as types.ResolvedLintTask[]
  const numTasksCached = skippedLintTasks.filter(
    (r) => r.lintResult.skipReason === 'cached'
  ).length
  const numTasksEmpty = skippedLintTasks.filter(
    (r) => r.lintResult.skipReason === 'empty'
  ).length
  const numTasksPrecheck = skippedLintTasks.filter(
    (r) => r.lintResult.skipReason === 'pre-process-file'
  ).length
  const numTasksDisabled = skippedLintTasks.filter(
    (r) =>
      r.lintResult.skipReason === 'inline-linter-disabled' ||
      r.lintResult.skipReason === 'rule-disabled'
  ).length

  console.log(
    'Linter tasks',
    pruneUndefined({
      numTasks: outstandingLintTasks.length,
      numTasksCached: numTasksCached || undefined,
      numTasksPrecheck: numTasksPrecheck || undefined,
      numTasksEmpty: numTasksEmpty || undefined,
      numTasksDisabled: numTasksDisabled || undefined
    })
  )

  if (config.linterOptions.debug) {
    console.log(
      outstandingLintTasks.map((task) => ({
        file: task.file.fileRelativePath,
        rule: task.rule.name
      }))
    )
  }

  if (config.linterOptions.earlyExit && lintResult.lintErrors.length > 0) {
    earlyExitTripped = true
  }

  if (onProgressInit) {
    await Promise.resolve(
      onProgressInit({ numTasks: outstandingLintTasks.length })
    )
  }

  const lintTaskGroups: Record<string, types.LintTaskGroup> = {}

  for (const lintTask of outstandingLintTasks) {
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
      const hasLintErrors = lintTaskGroup.lintResults.some(
        (result) => result.lintErrors.length > 0
      )

      if (!hasLintErrors) {
        lintTaskGroup.taskP!.then((task) => {
          task.clear()
        })
      }
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

      const {
        file,
        rule,
        cacheKey,
        config,
        lintResult: preProcessedTaskLintResult
      } = lintTask
      const lintTaskGroup = lintTaskGroups[file.fileRelativePath]!
      await lintTaskGroup.init()
      const lintTaskGroupInnerTask = lintTaskGroup.innerTask!

      let taskLintResult: types.LintResult | undefined

      const nestedTask = await lintTaskGroupInnerTask.task(
        rule.name,
        async (task) => {
          try {
            // Allow rules to override the default linting process with their
            // own, custom linting logic.
            const processFileFn: types.ProcessFileFn =
              rule.processFile ?? lintFile

            const processFileFnParams: types.ProcessFileFnParams = {
              file,
              rule,
              lintResult: preProcessedTaskLintResult,
              chatModel,
              cache,
              config,
              retryOptions: {
                ...retryOptions,
                onFailedAttempt: (err) => {
                  task.setOutput(`Retrying: ${err.message}`)
                  return retryOptions.onFailedAttempt?.(err)
                }
              }
            }

            taskLintResult = await processFileFn(processFileFnParams)
            assert(
              taskLintResult,
              `rule "${rule.name}" processFile returned undefined`
            )

            if (rule.postProcessFile) {
              taskLintResult = await Promise.resolve(
                rule.postProcessFile({
                  ...processFileFnParams,
                  lintResult: taskLintResult
                })
              )
            }

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
