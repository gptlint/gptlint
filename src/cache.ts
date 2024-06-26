import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { asyncExitHook } from 'exit-hook'
import stableStringify from 'fast-json-stable-stringify'
import hashObject from 'hash-object'
import { pathExists } from 'path-exists'

import type * as types from './types.js'
import { assert, pick, pruneUndefined } from './utils.js'

/**
 * Content-based cache of previous linter results.
 */
export class LinterCache<
  TKey extends string = string,
  TValue extends object = types.LintResult
> {
  noCache: boolean
  dryRun: boolean
  cacheDir?: string
  cacheFile?: string
  cache?: Record<string, string>

  protected _exitHookCleanupFn?: () => void

  constructor({
    cacheDir,
    cacheFileName = 'cache.json',
    noCache = false,
    dryRun = false
  }: {
    cacheDir?: string
    cacheFileName?: string
    noCache?: boolean
    dryRun?: boolean
  }) {
    this.cacheDir = cacheDir
    this.noCache = !!noCache
    this.dryRun = !!dryRun
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

    if (!this.cacheDir) {
      return this
    }

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
    const encodedValue = this.cache[key]

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
    this.cache[key] = encodedValue

    // TODO: don't write the value every time or move to a different local json db abstraction
    await this.flush()
  }

  async flush() {
    if (!this.cache || this.dryRun) return

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

export async function createLinterCache<
  TKey extends string = string,
  TValue extends object = types.LintResult
>(config: types.ResolvedLinterConfig): Promise<LinterCache<TKey, TValue>> {
  const cache = new LinterCache<TKey, TValue>({
    cacheDir: config.linterOptions.cacheDir,
    noCache: config.linterOptions.noCache,
    dryRun: config.linterOptions.dryRun
  })
  await cache.init()
  return cache
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
