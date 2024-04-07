import hashObject from 'hash-object'
import prettyMilliseconds from 'pretty-ms'

import type * as types from './types.js'
import { getLintDurationMs } from './lint-result.js'

export { default as slugify } from '@sindresorhus/slugify'
export { default as dedupe } from 'array-uniq'
export { default as assert } from 'tiny-invariant'

/**
 * From `obj`, create a new object that does not include `keys`.
 *
 * @example
 * ```
 * omit({ a: 1, b: 2, c: 3 }, 'a', 'c') // { b: 2 }
 * ```
 */
export const omit = <
  T extends Record<any, unknown>,
  K extends keyof T = keyof T
>(
  obj: T,
  ...keys: K[]
): Omit<T, K> => {
  const keysSet = new Set(keys)
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keysSet.has(k as any))
  ) as any
}

/**
 * From `obj`, create a new object that only includes `keys`.
 *
 * @example
 * ```
 * pick({ a: 1, b: 2, c: 3 }, 'a', 'c') // { a: 1, c: 3 }
 * ```
 */
export const pick = <
  T extends Record<any, unknown>,
  K extends keyof T = keyof T
>(
  obj: T,
  ...keys: K[]
): Pick<T, K> => {
  const keysSet = new Set(keys)
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => keysSet.has(k as any))
  ) as any
}

export function pruneUndefined<T extends Record<string, any>>(
  obj: T
): NonNullable<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as NonNullable<T>
}

export function isValidRuleName(name: string): name is NonNullable<string> {
  if (!name) return false
  if (name.toLowerCase() !== name) return false

  const parts = name.split('/')
  if (parts.length === 2) {
    if (!/^@[a-z][\w-]*$/i.test(parts[0]!)) return false
    if (!/^[a-z][\w-]*$/i.test(parts[1]!)) return false
  } else if (!/^[a-z][\w-]*$/i.test(name)) return false

  return true
}

export function isValidRuleSetting(
  value: string
): value is types.LinterConfigRuleSetting {
  if (!value) return false
  if (value.toLowerCase() !== value) return false

  return value === 'off' || value === 'warn' || value === 'error'
}

export function trimMessage(
  message: string | undefined,
  { maxLength = 80 }: { maxLength?: number } = {}
): string {
  if (!message) return ''

  message = message.trim()
  if (message.length < maxLength) return message
  message = `${message.slice(0, maxLength - 3)}...`

  return message
}

export function createEvalStats(): types.EvalStats {
  return {
    numFiles: 0,
    numRules: 0,
    numUnexpectedErrors: 0,
    numFalseNegatives: 0,
    numFalsePositives: 0,
    numTrueNegatives: 0,
    numTruePositives: 0
  }
}

export function mergeEvalStats(
  evalStatsA: types.EvalStats,
  evalStatsB: types.EvalStats
): types.EvalStats {
  return {
    numFiles: evalStatsA.numFiles + evalStatsB.numFiles,
    numRules: evalStatsA.numRules + evalStatsB.numRules,
    numUnexpectedErrors:
      evalStatsA.numUnexpectedErrors + evalStatsB.numUnexpectedErrors,
    numFalseNegatives:
      evalStatsA.numFalseNegatives + evalStatsB.numFalseNegatives,
    numFalsePositives:
      evalStatsA.numFalsePositives + evalStatsB.numFalsePositives,
    numTrueNegatives: evalStatsA.numTrueNegatives + evalStatsB.numTrueNegatives,
    numTruePositives: evalStatsA.numTruePositives + evalStatsB.numTruePositives
  }
}

const knownSupportedCodeFileExtensions = new Set([
  'js',
  'ts',
  'mjs',
  'cjs',
  'jsx',
  'tsx',
  'py',
  'r',
  'rb',
  'html',
  'md',
  'c',
  'cpp',
  'cs',
  'h',
  'go',
  'java',
  'lisp',
  'lua',
  'css',
  'scss',
  'swift',
  'svg',
  'tcl',
  'txt',
  'csv',
  'tsv',
  'yaml',
  'json',
  'elm',
  'sh',
  'bash',
  'fish',
  'd',
  'dart'
])

const knownCodeFileMappings: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  markdown: 'md',
  python: 'py',
  text: 'txt'
}

export function inferBestPossibleCodeFileExtension(
  lang?: string | null,
  { fallbacks }: { fallbacks?: string[] } = {}
): string | undefined {
  function handleFallbacks() {
    if (fallbacks) {
      for (const fallback of fallbacks) {
        const alias = inferBestPossibleCodeFileExtension(fallback)
        if (alias) return alias
      }
    }

    // Fallback to no file extension
    return undefined
  }

  lang = lang?.trim().toLowerCase()

  if (!lang) return handleFallbacks()

  if (knownSupportedCodeFileExtensions.has(lang)) return lang

  const alias = knownCodeFileMappings[lang]
  if (alias) return alias

  return handleFallbacks()
}

export function getEnv(
  name: string,
  defaultValue?: string
): string | undefined {
  try {
    return (
      (typeof process !== 'undefined'
        ? // eslint-disable-next-line no-process-env
          process.env?.[name]
        : undefined) ?? defaultValue
    )
  } catch {
    return defaultValue
  }
}

export function logDebugConfig({
  files,
  rules,
  config
}: {
  files?: types.SourceFile[]
  rules: types.Rule[]
  config: types.ResolvedLinterConfig
}) {
  console.log(
    '\nlogging resolved config and then exiting because `debugConfig` is enabled'
  )

  const sanitizedConfig = pruneUndefined({
    ...config,
    llmOptions: pruneUndefined({
      ...config.llmOptions,
      apiKey: '<redacted>'
    })
  })

  console.log('\nconfig', JSON.stringify(sanitizedConfig, undefined, 2))
  console.log('\nrules', JSON.stringify(rules, undefined, 2))

  if (files) {
    console.log(
      '\ninput files',
      JSON.stringify(
        files.map((file) => file.fileRelativePath),
        undefined,
        2
      )
    )
  }
}

export function logLintResultStats({
  lintResult,
  config,
  prefix
}: {
  lintResult: types.LintResult
  config: types.ResolvedLinterConfig
  prefix?: string
}) {
  const lintDurationMs = getLintDurationMs(lintResult)
  const lintDuration = lintDurationMs
    ? prettyMilliseconds(lintDurationMs)
    : undefined

  console.log(
    `${prefix ?? ''}Linter stats; total cost $${(
      lintResult.totalCost / 100
    ).toFixed(2)}`,
    pruneUndefined({
      ...pick(config.llmOptions, 'model', 'weakModel'),
      ...pick(
        lintResult,
        'numModelCalls',
        'numModelCallsCached',
        'numPromptTokens',
        'numCompletionTokens',
        'numTotalTokens'
      ),
      lintDuration
    })
  )
}

export function logEvalStats({
  evalStats
}: // ruleToEvalStats
{
  evalStats: types.EvalStats
  // ruleToEvalStats: Record<string, types.EvalStats>
}) {
  const precision =
    evalStats.numTruePositives /
    (evalStats.numTruePositives + evalStats.numFalsePositives)
  const recall =
    evalStats.numTruePositives /
    (evalStats.numTruePositives + evalStats.numFalseNegatives)
  const f1Score = (2 * precision * recall) / (precision + recall)
  const extendedStats = {
    precision,
    recall,
    f1Score
  }

  console.log(`\nEval results`, { ...evalStats, ...extendedStats })
  return extendedStats
}

export function createCacheKey({
  file,
  rule,
  config
}: {
  file: types.SourceFile
  rule: types.Rule
  config: types.LinterConfig
}): string {
  // TODO: add linter major version to the cache key
  const cacheKeySource = {
    // Only keep the relative file path, content, and detected language
    file: pruneUndefined(pick(file, 'fileRelativePath', 'content', 'language')),

    // Remove rule fields which don't affect LLM logic
    rule: pruneUndefined(
      pick(
        rule,
        'name',
        'message',
        'desc',
        'positiveExamples',
        'negativeExamples',
        'languages'
      )
    ),

    // Ensure the cache key depends on how the LLM is parameterized
    llmOptions: pruneUndefined(
      pick(
        config.llmOptions ?? {},
        'model',
        'weakModel',
        'temperature',
        'apiBaseUrl'
      )
    )
  }

  return hashObject(cacheKeySource)
}

export function createPromiseWithResolvers<
  T = unknown
>(): PromiseWithResolvers<T> {
  let resolve: (value: T | PromiseLike<T>) => void
  let reject: (reason: any) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve: resolve!, reject: reject! }
}
