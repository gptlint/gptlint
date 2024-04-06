import hashObject from 'hash-object'
import { expect, test } from 'vitest'

import { LinterCache } from './cache.js'
import { defaultCacheDir } from './config.js'

test(`LinterCache`, async () => {
  const cache = new LinterCache<string, any>({
    cacheDir: defaultCacheDir,
    cacheFileName: 'test.json'
  })

  await cache.init()

  const obj1 = { foo: [1, 2, { hello: 'world' }], bar: true }
  const key1 = hashObject(obj1)
  const value1 = { nala: true }

  const obj2 = { foo: [1, 2, { hello: 'world' }], bar: true }
  const key2 = hashObject(obj2)
  const value2 = { nala: true }

  const obj3: any = JSON.parse(JSON.stringify(obj1))
  const key3 = hashObject(obj3)
  const value3 = value1

  await cache.set(key1, value1)
  await expect(cache.get(key1)).resolves.toEqual(value1)
  await expect(cache.get(key1)).resolves.toEqual(value1)

  await cache.set(key2, value2)
  await expect(cache.get(key1)).resolves.toEqual(value1)
  await expect(cache.get(key2)).resolves.toEqual(value2)

  await cache.set(key3, value3)
  await expect(cache.get(key1)).resolves.toEqual(value1)
  await expect(cache.get(key3)).resolves.toEqual(value3)
  await expect(cache.get(key1)).resolves.toEqual(value3)

  await cache.flush()
  await cache.close()
})
