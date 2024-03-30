import type { ChatModel } from '@dexaai/dexter'
import slugify from '@sindresorhus/slugify'
import dedupe from 'array-uniq'
import invariant from 'tiny-invariant'

import type * as types from './types.js'

export { dedupe }
export { slugify }
export { invariant as assert }

/**
 * From `obj`, create a new object that does not include `keys`.
 *
 * @example
 * ```
 * omit({ a: 1, b: 2, c: 3 }, 'a', 'c') // { b: 2 }
 * ```
 */
export const omit = <T extends Record<any, unknown>, K extends keyof T>(
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
export const pick = <T extends Record<any, unknown>, K extends keyof T>(
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
    if (!/^@[a-zA-Z][a-zA-Z0-9-_]*$/i.test(parts[0]!)) return false
    if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/i.test(parts[1]!)) return false
  } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/i.test(name)) return false

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

export function createLintResult(): types.LintResult {
  return {
    lintErrors: [],
    numModelCalls: 0,
    numModelCallsCached: 0,
    numPromptTokens: 0,
    numCompletionTokens: 0,
    numTotalTokens: 0,
    totalCost: 0
  }
}

export function mergeLintResults(
  lintResultA: types.LintResult,
  lintResultB: types.LintResult
): types.LintResult {
  return {
    lintErrors: lintResultA.lintErrors.concat(lintResultB.lintErrors),
    numModelCalls: lintResultA.numModelCalls + lintResultB.numModelCalls,
    numModelCallsCached:
      lintResultA.numModelCallsCached + lintResultB.numModelCallsCached,
    numPromptTokens: lintResultA.numPromptTokens + lintResultB.numPromptTokens,
    numCompletionTokens:
      lintResultA.numCompletionTokens + lintResultB.numCompletionTokens,
    numTotalTokens: lintResultA.numTotalTokens + lintResultB.numTotalTokens,
    totalCost: lintResultA.totalCost + lintResultB.totalCost
  }
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
  python: 'py'
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
  } catch (e) {
    return defaultValue
  }
}

export function logDebugConfig({
  files,
  rules,
  config
}: {
  files?: types.InputFile[]
  rules: types.Rule[]
  config: types.ResolvedLinterConfig
}) {
  console.log(
    '\nlogging resolved config and then exiting because `debugConfig` is enabled'
  )
  console.log('\nconfig', JSON.stringify(config, null, 2))
  if (files) {
    console.log(
      '\ninput files',
      JSON.stringify(
        files.map((file) => file.fileRelativePath),
        null,
        2
      )
    )
  }
  console.log('\nrules', JSON.stringify(rules, null, 2))
}

export function logDebugStats({
  lintResult,
  config
}: {
  lintResult: types.LintResult
  config: types.ResolvedLinterConfig
}) {
  console.log(
    `\nLLM stats; total cost $${(lintResult.totalCost / 100).toFixed(2)}`,
    {
      model: config.llmOptions.model,
      ...pick(
        lintResult,
        'numModelCalls',
        'numModelCallsCached',
        'numPromptTokens',
        'numCompletionTokens',
        'numTotalTokens'
      )
    }
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
  chatModel
}: {
  file: types.InputFile
  rule: types.Rule
  chatModel: ChatModel
}): any {
  // TODO: add linter major version to the cache key
  return {
    // Only keep the relative file path, content, and detected language
    file: omit(file, 'filePath', 'fileName'),

    // Remove rule fields which don't affect LLM logic
    rule: omit(rule, 'fixable', 'source', 'level'),

    // Ensure the cache key depends on how the LLM is parameterized
    params: chatModel.getParams()
  }
}
