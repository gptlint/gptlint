import type { ChatModel } from '@dexaai/dexter'
import pMap from 'p-map'
import plur from 'plur'
import task from 'tasuku'

import type { LinterCache } from './cache.js'
import type * as types from './types.js'
import { lintFile } from './lint-file.js'
import {
  createLintResult,
  mergeLintResults,
  resolvePartialLintResult
} from './lint-result.js'
import { createLintTask, stringifyLintTask } from './lint-task.js'
import { preProcessTask } from './pre-process-task.js'
import {
  assert,
  createPromiseWithResolvers,
  pruneUndefined,
  trimMessage
} from './utils.js'

// TODO: refactor `file` scope vs `project` scope to be less verbose

/**
 * Takes in a list of source files and rules, transforms these into a set
 * of LintTasks, pre-processes each lint task (e.g. caching, validation),
 * processes the non-cached tasks with the LLM-based linting engine, post-
 * processes the results, and then retursn an aggregated LintResult.
 */
export async function lintFiles({
  files,
  rules,
  config,
  cache,
  chatModel,
  cwd = process.cwd(),
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
  cwd?: string
  retryOptions?: types.RetryOptions
  onProgress?: types.ProgressHandlerFn
  onProgressInit?: types.ProgressHandlerInitFn
}): Promise<types.LintResult> {
  await pMap(rules, async (rule) =>
    // TODO: add error handling to this so one rule doesn't prevent others from
    // running properly
    rule.init?.({
      rule,
      cache,
      config,
      chatModel,
      cwd,
      retryOptions
    })
  )

  const projectLintTasks: types.LintTask[] = rules
    .map((rule) => {
      if (rule.scope === 'project' || rule.scope === 'repo') {
        return createLintTask({ rule, config })
      } else {
        return undefined
      }
    })
    .filter(Boolean)

  const fileLintTasks: types.LintTask[] = rules
    .flatMap((rule) => {
      if (rule.scope === 'file') {
        // TODO: Experiment with different types of file <> rule mappings.
        return files.map((file) => createLintTask({ file, rule, config }))
      } else {
        return []
      }
    })
    .filter(Boolean)

  const initialLintTasks = projectLintTasks.concat(fileLintTasks)

  let lintResult = createLintResult()
  let earlyExitTripped = false
  const warnings: Error[] = []

  // Preprocess the file / rule tasks so we have a clear indication of how many
  // non-cached, non-disabled tasks need to be processed.
  const preProcessedLintTasks: types.LintTask[] = (
    await pMap(
      initialLintTasks,
      async (lintTask) => {
        if (earlyExitTripped) {
          return
        }

        try {
          const { rule, scope } = lintTask
          const model =
            rule.model ?? config.llmOptions.weakModel ?? config.llmOptions.model

          if (rule.preProcessProject) {
            const partialProjectLintResult = await Promise.resolve(
              rule.preProcessProject({
                ...lintTask,
                chatModel,
                cache,
                retryOptions,
                cwd
              })
            )

            if (partialProjectLintResult) {
              const { lintErrors, skipped } = partialProjectLintResult

              lintTask.lintResult = resolvePartialLintResult(
                lintErrors || skipped
                  ? {
                      ...partialProjectLintResult,
                      skipped: true,
                      skipReason: 'pre-process-project'
                    }
                  : partialProjectLintResult,
                {
                  model,
                  rule,
                  filePath: cwd
                }
              )
            }
          }

          if (lintTask.lintResult) {
            return lintTask
          }

          // Always run the built-in pre-processing logic for caching and validation
          // purposes. Then run any custom, rule-specific pre-processing logic if
          // it exists.
          lintTask = await preProcessTask(lintTask, { cache })

          if (lintTask.lintResult) {
            return lintTask
          }

          if (scope === 'file') {
            const file = lintTask.file
            assert(file)

            if (rule.preProcessFile) {
              const partialFileLintResult = await Promise.resolve(
                rule.preProcessFile({
                  ...lintTask,
                  file,
                  chatModel,
                  cache,
                  retryOptions,
                  cwd
                })
              )

              if (partialFileLintResult) {
                const { lintErrors, skipped } = partialFileLintResult

                lintTask.lintResult = resolvePartialLintResult(
                  lintErrors || skipped
                    ? {
                        ...partialFileLintResult,
                        skipped: true,
                        skipReason: 'pre-process-file'
                      }
                    : partialFileLintResult,
                  {
                    model,
                    rule,
                    file
                  }
                )
              }
            }
          }

          return lintTask
        } catch (err: any) {
          const error = new Error(
            `${stringifyLintTask(lintTask)} unexpected preProcess error: ${err.message}`,
            { cause: err }
          )
          console.warn(error.message)
          warnings.push(error)
        } finally {
          if (lintTask.lintResult) {
            lintResult = mergeLintResults(lintResult, lintTask.lintResult)
          }

          if (
            config.linterOptions.earlyExit &&
            lintResult.lintErrors.length > 0
          ) {
            earlyExitTripped = true
          }
        }
      },
      {
        concurrency: config.linterOptions.concurrency
      }
    )
  ).filter(Boolean)

  const outstandingLintTasks = preProcessedLintTasks.filter(
    (r) => !r.lintResult?.skipped && !r.lintResult?.lintErrors
  )
  const skippedLintTasks = preProcessedLintTasks.filter(
    (r) => r.lintResult?.skipped || r.lintResult?.lintErrors
  ) as types.ResolvedLintTask[]
  const numTasksCached = skippedLintTasks.filter(
    (r) => r.lintResult.skipReason === 'cached'
  ).length
  const numTasksEmpty = skippedLintTasks.filter(
    (r) => r.lintResult.skipReason === 'empty'
  ).length
  const numTasksPrecheck = skippedLintTasks.filter(
    (r) =>
      r.lintResult.skipReason === 'pre-process-file' ||
      r.lintResult.skipReason === 'pre-process-project'
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
      outstandingLintTasks.map((task) =>
        pruneUndefined({
          file: task.file?.fileRelativePath,
          rule: task.rule.name
        })
      )
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
    const { group } = lintTask

    if (!lintTaskGroups[group]) {
      const lintTaskGroupName = config.linterOptions.dryRun
        ? `Dry run ${group}`
        : `Linting ${group}`

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
              this.taskP = task(lintTaskGroupName, async (innerTask) => {
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
        group,
        scope,
        file,
        rule,
        cacheKey,
        config,
        lintResult: preProcessedTaskLintResult
      } = lintTask

      const lintTaskGroup = lintTaskGroups[group]!
      assert(lintTaskGroup)
      await lintTaskGroup.init()
      const lintTaskGroupInnerTask = lintTaskGroup.innerTask!

      let taskLintResult: types.LintResult | undefined
      let taskLintError: Error | undefined

      const nestedTask = await lintTaskGroupInnerTask.task(
        rule.name,
        async (task) => {
          try {
            const processProjectFnParams: types.RuleProcessProjectFnParams = {
              rule,
              lintResult: preProcessedTaskLintResult,
              chatModel,
              cache,
              config,
              cwd,
              retryOptions: {
                ...retryOptions,
                onFailedAttempt: (err) => {
                  task.setOutput(`Retrying: ${err.message}`)
                  return retryOptions.onFailedAttempt?.(err)
                }
              }
            }

            if (scope === 'file') {
              // Allow rules to override the default linting process with their
              // own, custom linting logic.
              const processFileFn: types.RuleProcessFileFn =
                rule.processFile ?? lintFile

              const processFileFnParams: types.RuleProcessFileFnParams = {
                ...processProjectFnParams,
                file
              }

              const partialTaskLintResult =
                await processFileFn(processFileFnParams)

              taskLintResult = resolvePartialLintResult(partialTaskLintResult, {
                rule,
                file
              })

              if (rule.postProcessFile) {
                const partialPostTaskLintResult = await Promise.resolve(
                  rule.postProcessFile({
                    ...processFileFnParams,
                    lintResult: taskLintResult
                  })
                )

                if (partialPostTaskLintResult) {
                  taskLintResult = resolvePartialLintResult(
                    partialPostTaskLintResult,
                    {
                      rule,
                      file
                    }
                  )
                }
              }
            } else {
              if (rule.processProject) {
                const partialTaskLintResult = await rule.processProject(
                  processProjectFnParams
                )

                taskLintResult = resolvePartialLintResult(
                  partialTaskLintResult,
                  {
                    rule,
                    file
                  }
                )
              }

              if (rule.postProcessProject) {
                const partialPostTaskLintResult = await Promise.resolve(
                  rule.postProcessProject({
                    ...processProjectFnParams,
                    lintResult: taskLintResult
                  })
                )

                if (partialPostTaskLintResult) {
                  taskLintResult = resolvePartialLintResult(
                    partialPostTaskLintResult,
                    {
                      rule,
                      file
                    }
                  )
                }
              }
            }

            if (!taskLintResult) {
              return
            }

            if (cacheKey) {
              await cache.set(cacheKey, taskLintResult)
            }

            lintResult = mergeLintResults(lintResult, taskLintResult)
            const { lintErrors } = taskLintResult

            if (config.linterOptions.earlyExit && lintErrors.length > 0) {
              earlyExitTripped = true
            }

            if (onProgress) {
              await Promise.resolve(
                onProgress({
                  progress: index / sortedLintTasks.length,
                  message: stringifyLintTask(lintTask),
                  result: lintResult
                })
              )
            }

            if (lintErrors.length > 0) {
              const lintErrorPrefixDesc = `found ${lintErrors.length} lint ${plur(
                'error',
                lintErrors.length
              )}`
              const lintErrorShortDesc =
                lintErrors.length === 1
                  ? trimMessage(
                      lintErrors[0]?.codeSnippet ?? lintErrors[0]?.message,
                      { maxLength: 60 }
                    )
                  : ''
              const lintErrorDesc = [lintErrorPrefixDesc, lintErrorShortDesc]
                .filter(Boolean)
                .join(' ')

              task.setError(lintErrorDesc)
            }
          } catch (err: any) {
            const error = new Error(
              `${stringifyLintTask(lintTask)} unexpected error: ${err.message}`,
              { cause: err }
            )
            console.warn(error.message)
            taskLintError = error
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
      } else if (!taskLintError) {
        nestedTask.clear()
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
