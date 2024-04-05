import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { asyncExitHook } from 'exit-hook'
import stableStringify from 'fast-json-stable-stringify'
import hashObject from 'hash-object'
import { pathExists } from 'path-exists'

import type * as types from './types.js'
import { assert } from './utils.js'

/**
 * Content-based cache of previous linter results.
 */
export class LinterCache<
  TKey extends object = any,
  TValue extends object = types.LintResult
> {
  noCache: boolean
  cacheDir?: string
  cacheFile?: string
  cache?: Record<string, string>

  protected _exitHookCleanupFn?: () => void

  constructor({
    cacheDir,
    cacheFileName = 'cache.json',
    noCache = false
  }: {
    cacheDir?: string
    cacheFileName?: string
    noCache?: boolean
  }) {
    this.cacheDir = cacheDir
    this.noCache = !!noCache
    this.cacheFile = this.cacheDir
      ? path.join(this.cacheDir, cacheFileName)
      : undefined

    this._exitHookCleanupFn = asyncExitHook(() => this.close(), {
      wait: 1000
    })
  }

  async init(): Promise<this> {
    if (this.cache) return this
    this.cache = {}

    // console.log('cache', {
    //   cacheDir: this.cacheDir,
    //   cacheFile: this.cacheFile,
    //   noCache: this.noCache
    // })

    if (this.cacheDir) {
      const cacheFile = this.cacheFile!

      try {
        await fs.mkdir(this.cacheDir, { recursive: true })

        if (await pathExists(cacheFile)) {
          const encodedCache = fsSync.readFileSync(cacheFile, {
            encoding: 'utf8'
          })

          this.cache = JSON.parse(encodedCache) as Record<string, string>
        }
      } catch (err: any) {
        console.warn(
          `Failed to initialize cache "${cacheFile}". Continuing with empty cache.`,
          err.message
        )
      }
    }

    return this
  }

  async close() {
    if (this._exitHookCleanupFn) {
      this.flush()
      delete this.cache
      delete this._exitHookCleanupFn
    }
  }

  async get(key: TKey): Promise<TValue | undefined> {
    if (this.noCache) return

    assert(this.cache, 'Must call LinterCache.init')
    const encodedValue = this.cache[getCacheKey(key)]

    if (encodedValue === undefined) {
      return undefined
    } else {
      const decodedValue = JSON.parse(encodedValue) as TValue
      return decodedValue
    }
  }

  async set(key: TKey, value: TValue) {
    assert(this.cache, 'Must call LinterCache.init')
    const encodedValue = JSON.stringify(value)
    this.cache[getCacheKey(key)] = encodedValue

    // TODO: don't write the value every time or move to a different local json db abstraction
    await this.flush()
  }

  async flush() {
    if (!this.cache) return

    const cacheFile = this.cacheFile
    if (cacheFile) {
      await fs.mkdir(this.cacheDir!, { recursive: true })
      if (!this.cache) return

      fsSync.writeFileSync(cacheFile, stableStringify(this.cache), {
        encoding: 'utf8'
      })
    }
  }
}

export function getCacheKey<T extends object = any>(obj: T): string {
  return hashObject(obj)
}

export async function createLinterCache<
  TKey extends object = any,
  TValue extends object = types.LintResult
>(config: types.ResolvedLinterConfig): Promise<LinterCache<TKey, TValue>> {
  const cache = new LinterCache<TKey, TValue>({
    cacheDir: config.linterOptions.cacheDir,
    noCache: config.linterOptions.noCache
  })
  await cache.init()
  return cache
}
