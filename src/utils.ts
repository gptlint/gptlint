import slugify from '@sindresorhus/slugify'
import invariant from 'tiny-invariant'

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
