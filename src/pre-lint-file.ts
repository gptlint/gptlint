import type { ChatModel } from '@dexaai/dexter'
import plur from 'plur'

import type * as types from './types.js'
import { type LinterCache } from './cache.js'
import { mergeLinterConfigs } from './config.js'
import { parseInlineConfig } from './parse-inline-config.js'
import { createCacheKey, createLintResult, trimMessage } from './utils.js'

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
  chatModel,
  cache,
  config
}: {
  file: types.InputFile
  rule: types.Rule
  chatModel: ChatModel
  cache: LinterCache
  config: types.ResolvedLinterConfig
}): Promise<types.PreLintResult> {
  const lintResult = createLintResult()

  const preLintResult: types.PreLintResult = {
    file,
    rule,
    config,
    cacheKey: createCacheKey({ file, rule, chatModel })
  }

  if (!file.content.trim()) {
    // Ignore empty files
    return preLintResult
  }

  const cachedResult = await cache.get(preLintResult.cacheKey)
  if (cachedResult) {
    lintResult.lintErrors = cachedResult.lintErrors
    lintResult.message = cachedResult.message
    lintResult.numModelCallsCached++

    if (config.linterOptions.debug) {
      const { lintErrors } = lintResult

      if (lintErrors.length) {
        console.log(
          `\nFAIL CACHE HIT Rule "${rule.name}" file "${
            file.fileRelativePath
          }": ${lintErrors.length} ${plur('error', lintErrors.length)} found:`,
          lintErrors
        )
      } else {
        console.log(
          `\nPASS CACHE HIT Rule "${rule.name}" file "${
            file.fileRelativePath
          }": ${lintErrors.length} ${plur(
            'error',
            lintErrors.length
          )} found: ${trimMessage(lintResult.message)}`
        )
      }
    }

    return { ...preLintResult, lintResult }
  }

  if (!config.linterOptions.noInlineConfig) {
    const configFileOverride = parseInlineConfig({ file })
    if (configFileOverride) {
      if (configFileOverride.linterOptions?.disabled) {
        // Inline config disabled linting for this file
        await cache.set(preLintResult.cacheKey, lintResult)
        return { ...preLintResult, lintResult }
      } else {
        // Inline config overrides for this file
        preLintResult.config = mergeLinterConfigs(
          preLintResult.config,
          configFileOverride
        ) as types.ResolvedLinterConfig
      }
    }
  }

  if (preLintResult.config.rules[rule.name] === 'off') {
    // Config has this rule disabled for this file
    return { ...preLintResult, lintResult }
  }

  // console.log(
  //   `rule "${rule.name}" file "${
  //     file.fileRelativePath
  //   }" cacheKey "${getCacheKey(preLintResult.cacheKey)}"`
  // )

  // No cached result
  return preLintResult
}
