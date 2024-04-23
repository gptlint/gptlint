import path from 'node:path'
import { fileURLToPath } from 'node:url'

import chalk from 'chalk'
import { gracefulExit } from 'exit-hook'
import { globby, type Options as GlobbyOptions } from 'globby'
import multimatch from 'multimatch'

import type * as types from './types.js'
import { getLintDurationMs } from './lint-result.js'

export { default as slugify } from '@sindresorhus/slugify'
export { default as dedupe } from 'array-uniq'
export { default as assert } from 'tiny-invariant'

/**
 * From `inputObj`, create a new object that does not include `keys`.
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
  inputObj: T,
  ...keys: K[]
): Omit<T, K> => {
  const keysSet = new Set(keys)
  return Object.fromEntries(
    Object.entries(inputObj).filter(([k]) => !keysSet.has(k as any))
  ) as any
}

/**
 * From `inputObj`, create a new object that only includes `keys`.
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
  inputObj: T,
  ...keys: K[]
): Pick<T, K> => {
  const keysSet = new Set(keys)
  return Object.fromEntries(
    Object.entries(inputObj).filter(([k]) => keysSet.has(k as any))
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
    `\n${chalk.italic('logging resolved config and then exiting because `printConfig` is enabled')}`
  )

  const sanitizedConfig = config.getSanitizedDebugConfig()
  console.log(
    `\n${chalk.bold('config')}`,
    JSON.stringify(sanitizedConfig, undefined, 2)
  )

  if (rules) {
    if (rules.length) {
      console.log(
        `\n${chalk.bold('rules')}`,
        JSON.stringify(
          rules.map((rule) => ({
            ...rule,
            description: rule.description
              ? trimMessage(rule.description)
              : undefined,
            gritql: rule.gritql ? trimMessage(rule.gritql) : undefined
          })),
          undefined,
          2
        )
      )
    } else {
      console.warn(`\n${chalk.bold('warning: no rules found')}`)
    }
  }

  if (files) {
    if (files.length) {
      console.log(
        `\n${chalk.bold('input files')}`,
        JSON.stringify(
          files.map((file) => file.fileRelativePath),
          undefined,
          2
        )
      )
    } else {
      console.warn(`\n${chalk.bold('warning: no input source files found')}`)
    }
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

  const invalidPatterns = patterns.filter((pattern) => !pattern)
  if (invalidPatterns.length) {
    throw new Error(
      `Invalid file glob empty pattern: "${invalidPatterns.join(', ')}"`
    )
  }

  const cwd = (options?.cwd as string) ?? process.cwd()
  const absolutePatterns = patterns
    .filter((pattern) => path.isAbsolute(pattern) || pattern.startsWith('..'))
    .map((pattern) => path.relative(cwd, pattern))
  const relativePatterns = patterns
    .filter(
      (pattern) => !(path.isAbsolute(pattern) || pattern.startsWith('..'))
    )
    .map((pattern) => path.relative(cwd, pattern))

  // TODO: workaround this `globby` restriction
  // TODO: this will involve returning absolute file paths from this function
  // TODO: this will likely involve using `multimatch` directly
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

export function fileMatchesIncludeExclude(
  file: types.SourceFile,
  {
    include,
    exclude
  }: {
    include?: string[]
    exclude?: string[]
  }
) {
  if (include) {
    const matches = multimatch(file.fileRelativePath, include)
    if (!matches.length) {
      return false
    }
  }

  if (exclude?.length) {
    const matches = multimatch(file.fileRelativePath, exclude)
    if (matches.length) {
      return false
    }
  }

  return true
}

export function validateLinterInputs({
  config,
  files,
  rules
}: {
  config: types.ResolvedLinterConfig
  files?: types.SourceFile[]
  rules?: types.Rule[]
}): boolean {
  if (config.linterOptions.printConfig) {
    logDebugConfig({ files, rules, config })
    gracefulExit(0)
    return false
  }

  if (files && !files.length) {
    console.error(
      `\n${chalk.bold('Error: no source files found')} (${chalk.italic('run with --print-config to debug')})\n`
    )
    gracefulExit(1)
    return false
  }

  if (rules && !rules.length) {
    console.error(
      `\n${chalk.bold('Error: no rules enabled')} (${chalk.italic('run with --print-config to debug')})\n`
    )
    gracefulExit(1)
    return false
  }

  return true
}
