import fs from 'node:fs/promises'
import path from 'node:path'

import { asyncExitHook, gracefulExit } from 'exit-hook'
import stableStringify from 'fast-json-stable-stringify'
import hashObject from 'hash-object'
import { pathExists } from 'path-exists'

import type * as types from './types.js'
import { assert } from './utils.js'

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

  async init() {
    if (this.cache) return
    this.cache = {}

    // console.log('cache', {
    //   cacheDir: this.cacheDir,
    //   cacheFile: this.cacheFile,
    //   noCache: this.noCache
    // })

    if (this.cacheDir && !this.noCache) {
      const cacheFile = this.cacheFile!

      try {
        await fs.mkdir(this.cacheDir, { recursive: true })

        if (await pathExists(cacheFile)) {
          const encodedCache = await fs.readFile(cacheFile, {
            encoding: 'utf-8'
          })

          this.cache = JSON.parse(encodedCache) as Record<string, string>
        }
      } catch (err: any) {
        console.error(`Failed to initialize cache "${cacheFile}"`, err.message)
        return gracefulExit(1)
      }
    }
  }

  async close() {
    if (this._exitHookCleanupFn) {
      this.flush()
      delete this.cache
      delete this._exitHookCleanupFn
    }
  }

  async get(key: TKey): Promise<TValue | undefined> {
    assert(this.cache, 'Must call LinterCache.init')
    const encodedValue = this.cache[this._getKey(key)]

    if (encodedValue !== undefined) {
      const decodedValue = JSON.parse(encodedValue) as TValue
      return decodedValue
    } else {
      return undefined
    }
  }

  async set(key: TKey, value: TValue) {
    assert(this.cache, 'Must call LinterCache.init')
    const encodedValue = JSON.stringify(value)
    this.cache[this._getKey(key)] = encodedValue

    // TODO: don't write the value every time or move to a different local json db abstraction
    await this.flush()
  }

  async flush() {
    if (!this.cache) return

    const cacheFile = this.cacheFile
    if (cacheFile) {
      await fs.mkdir(this.cacheDir!, { recursive: true })
      if (!this.cache) return

      await fs.writeFile(cacheFile, stableStringify(this.cache), {
        encoding: 'utf-8'
      })
    }
  }

  protected _getKey(key: TKey): string {
    return hashObject(key)
  }
}
