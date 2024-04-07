import type * as types from './types.js'
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
export async function preProcessFile({
  file,
  rule,
  cache,
  config
}: types.PreProcessFileFnParams): Promise<types.LintTask> {
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
    return {
      ...lintTask,
      lintResult: { ...lintResult, skipped: true, skipReason: 'empty' }
    }
  }

  const cachedResult = await cache.get(lintTask.cacheKey)
  if (cachedResult) {
    lintResult.lintErrors = cachedResult.lintErrors
    lintResult.message = cachedResult.message
    lintResult.numModelCallsCached++
    lintResult.skipped = true
    lintResult.skipReason = 'cached'

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

    return { ...lintTask, lintResult }
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
          lintResult: {
            ...lintResult,
            skipped: true,
            skipReason: 'inline-linter-disabled'
          }
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
    return {
      ...lintTask,
      lintResult: { ...lintResult, skipped: true, skipReason: 'rule-disabled' }
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
