import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import hashObject from 'hash-object'
import Keyv from 'keyv'
import { KeyvFile } from 'keyv-file'

import type * as types from './types.js'
import { assert } from './utils.js'

export class LinterCache<
  TKey extends object = any,
  TValue extends object = types.LintError[]
> {
  noCache: boolean
  cacheDir?: string
  keyv?: Keyv<TValue>

  constructor({ cacheDir, noCache }: { cacheDir?: string; noCache?: boolean }) {
    this.cacheDir = cacheDir
    this.noCache = !!noCache
  }

  async init() {
    if (this.cacheDir && !this.noCache) {
      await mkdir(this.cacheDir, { recursive: true })

      this.keyv = new Keyv({
        store: new KeyvFile({
          filename: path.join(this.cacheDir, 'cache.json'),
          writeDelay: 100,
          encode: JSON.stringify,
          decode: JSON.parse
        })
      })
    } else {
      // Fallback to an in-memory cache
      this.keyv = new Keyv()
    }
  }

  protected _getKey(key: TKey): string {
    return hashObject(key)
  }

  async get(key: TKey): Promise<TValue | undefined> {
    assert(this.keyv, 'Must call LinterCache.init')
    return this.keyv!.get(this._getKey(key))
  }

  async set(key: TKey, value: TValue) {
    assert(this.keyv, 'Must call LinterCache.init')
    return this.keyv!.set(this._getKey(key), value)
  }
}
