import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { globby, type Options as GlobbyOptions } from 'globby'
import hashObject from 'hash-object'

import type * as types from './types.js'
import { getLintDurationMs } from './lint-result.js'

export { default as slugify } from '@sindresorhus/slugify'
export { default as dedupe } from 'array-uniq'
export { default as assert } from 'tiny-invariant'

/**
 * From `obj`, create a new object that does not include `keys`.
 *
 * @example
 * ```js
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
 * ```js
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

// TODO: consider using `cli-truncate` instead
export function trimMessage(
  message: string | undefined,
  { maxLength = 80 }: { maxLength?: number } = {}
): string {
  if (!message) return ''

  message = message.trim().split('\n')[0]!.trim()
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
  rules?: types.Rule[]
  config: types.ResolvedLinterConfig
}) {
  console.log(
    '\nlogging resolved config and then exiting because `printConfig` is enabled'
  )

  const sanitizedConfig = pruneUndefined({
    ...config,
    llmOptions: pruneUndefined({
      ...config.llmOptions,
      apiKey: '<redacted>'
    })
  })

  console.log('\nconfig', JSON.stringify(sanitizedConfig, undefined, 2))

  if (rules) {
    console.log('\nrules', JSON.stringify(rules, undefined, 2))
  }

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
    ? `${Math.ceil(lintDurationMs / 1000)}s`
    : undefined

  console.log(
    `${prefix ?? ''}Linter stats; ${config.linterOptions.dryRun ? 'dry run estimated cost' : 'total cost'} $${(
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
  rule,
  file,
  config,
  ...extra
}: {
  rule: types.Rule
  file?: types.SourceFile
  config: types.LinterConfig
} & Record<string, unknown>): string {
  // TODO: add linter major version to the cache key
  const cacheKeySource = pruneUndefined({
    ...extra,

    file: file
      ? // Only keep the relative file path, content, and detected language
        pruneUndefined(pick(file, 'fileRelativePath', 'content', 'language'))
      : undefined,

    // Only keep the rule fields which affect the linting logic
    rule: pruneUndefined(
      pick(
        rule,
        'name',
        'title',
        'description',
        'positiveExamples',
        'negativeExamples',
        'level',
        'scope',
        'model',
        'languages',
        'gritql',
        'gritqlNumLinesContext'
        // TODO: include / exclude? languages?
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
    ),

    linterOptions: pruneUndefined(pick(config.linterOptions ?? {}, 'noGrit'))
  })

  return hashObject(cacheKeySource)
}

/** Polyfill for `Promise.withResolvers()` */
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

/**
 * Wraps [globby](https://github.com/sindresorhus/globby) to correctly handle
 * absolute file patterns that exist outside of the `cwd`.
 */
export async function resolveGlobFilePatterns(
  patternOrPatterns: string | readonly string[],
  options?: GlobbyOptions
): Promise<string[]> {
  const patterns = Array.isArray(patternOrPatterns)
    ? (patternOrPatterns as readonly string[])
    : [patternOrPatterns as string]

  const cwd = (options?.cwd as string) ?? process.cwd()
  const absolutePatterns = patterns
    .filter((pattern) => path.isAbsolute(pattern) || pattern.startsWith('..'))
    .map((pattern) => path.relative(cwd, pattern))
  const relativePatterns = patterns
    .filter(
      (pattern) => !(path.isAbsolute(pattern) || pattern.startsWith('..'))
    )
    .map((pattern) => path.relative(cwd, pattern))

  for (const pattern of absolutePatterns) {
    if (/\*/.test(pattern)) {
      throw new Error(
        `File globs must be local to cwd or not use "*" glob syntax: ${pattern}`
      )
    }
  }

  try {
    // console.log('resolveGlobFilePatterns', {
    //   relativePatterns,
    //   absolutePatterns,
    //   cwd
    // })
    const resolvedFilePatterns = await globby(relativePatterns, options)

    return absolutePatterns.concat(resolvedFilePatterns)
  } catch (err: any) {
    console.error('error resolving glob patterns:', err.message)
    throw err
  }
}

export function dirname(meta = import.meta) {
  return meta.dirname ?? path.dirname(fileURLToPath(meta.url))
}
