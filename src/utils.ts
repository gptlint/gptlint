import slugify from '@sindresorhus/slugify'
import invariant from 'tiny-invariant'

import type * as types from './types.js'

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
): Omit<T, K> =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keys.includes(k as any))
  ) as any

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
): Pick<T, K> =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => keys.includes(k as any))
  ) as any

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
