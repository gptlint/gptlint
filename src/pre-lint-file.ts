import pMap from 'p-map'

import type * as types from './types.js'
import { type LinterCache } from './cache.js'
import { mergeLinterConfigs } from './config.js'
import { createLintResult } from './lint-result.js'
import { parseInlineConfig } from './parse-inline-config.js'
import { createCacheKey, createPromiseWithResolvers } from './utils.js'

/**
 * If the result contains a `lintResult`, then that is the cached result which
 * should be used.
 *
 * If the result does not contain a `lintResult`, then the file / rule is not
 * cached and needs to be processed.
 */
export async function preLintFile({
  file,
  rule,
  cache,
  config
}: {
  file: types.InputFile
  rule: types.Rule
  cache: LinterCache
  config: types.ResolvedLinterConfig
}): Promise<types.LintTask> {
  const lintResult = createLintResult()

  const lintTaskP = createPromiseWithResolvers()
  const lintTask: types.LintTask = {
    ...lintTaskP,
    file,
    rule,
    config,
    cacheKey: createCacheKey({ file, rule, config })
  }

  if (!file.content.trim()) {
    // Ignore empty files
    return { ...lintTask, lintResult, skipReason: 'empty' }
  }

  const cachedResult = await cache.get(lintTask.cacheKey)
  if (cachedResult) {
    lintResult.lintErrors = cachedResult.lintErrors
    lintResult.message = cachedResult.message
    lintResult.numModelCallsCached++

    // if (config.linterOptions.debug) {
    //   const { lintErrors } = lintResult

    //   if (lintErrors.length) {
    //     console.log(
    //       `\nFAIL CACHE HIT Rule "${rule.name}" file "${
    //         file.fileRelativePath
    //       }": ${lintErrors.length} ${plur('error', lintErrors.length)} found:`,
    //       lintErrors
    //     )
    //   } else {
    //     console.log(
    //       `\nPASS CACHE HIT Rule "${rule.name}" file "${
    //         file.fileRelativePath
    //       }": ${lintErrors.length} ${plur('error', lintErrors.length)} found`
    //     )
    //   }
    // }

    return { ...lintTask, lintResult, skipReason: 'cached' }
  }

  // TODO: This should probably be moved to run a single time per file instead
  // of per lint task
  if (!config.linterOptions.noInlineConfig) {
    const configFileOverride = parseInlineConfig({ file })
    if (configFileOverride) {
      if (configFileOverride.linterOptions?.disabled) {
        // Inline config disabled linting for this file
        await cache.set(lintTask.cacheKey, lintResult)
        return {
          ...lintTask,
          lintResult,
          skipReason: 'inline-linter-disabled'
        }
      } else {
        // Inline config overrides for this file
        lintTask.config = mergeLinterConfigs(
          lintTask.config,
          configFileOverride
        ) as types.ResolvedLinterConfig
      }
    }
  }

  if (lintTask.config.rules[rule.name] === 'off') {
    // Config has this rule disabled for this file
    return { ...lintTask, lintResult, skipReason: 'rule-disabled' }
  }

  if (rule.prechecks) {
    let precheckFailure: string | undefined

    await pMap(
      rule.prechecks,
      async (precheck) => {
        if (precheckFailure) return

        try {
          const passedPrecheck = await Promise.resolve(
            precheck.fileCheckFn({ file })
          )

          if (!passedPrecheck) {
            precheckFailure = precheck.desc
          }
        } catch (err: any) {
          precheckFailure = `Unexpected precheck error: ${err.message} (${precheck.desc})`
          throw new Error(precheckFailure)
        }
      },
      { concurrency: config.linterOptions.concurrency }
    )

    // console.log(
    //   `rule "${rule.name}" file "${file.fileRelativePath}" precheck failure: ${precheckFailure}`
    // )

    if (precheckFailure) {
      return {
        ...lintTask,
        lintResult,
        skipReason: 'failed-precheck',
        skipDetail: precheckFailure
      }
    }
  }

  // console.log(
  //   `rule "${rule.name}" file "${
  //     file.fileRelativePath
  //   }" cacheKey "${getCacheKey(lintTask.cacheKey)}"`
  // )

  // No cached result
  return lintTask
}
