import { expect, test } from 'vitest'

import { getCacheKey, LinterCache } from './cache.js'
import { defaultCacheDir } from './config.js'

test(`LinterCache`, async () => {
  const cache = new LinterCache<any, any>({
    cacheDir: defaultCacheDir,
    cacheFileName: 'test.json'
  })

  await cache.init()

  const obj1 = { foo: [1, 2, { hello: 'world' }], bar: true }
  const value1 = { nala: true }

  const obj2 = { foo: [1, 2, { hello: 'world' }], bar: true }
  const value2 = { nala: true }

  const obj3 = JSON.parse(JSON.stringify(obj1))
  const value3 = value1

  await cache.set(obj1, value1)
  await expect(cache.get(obj1)).resolves.toEqual(value1)
  await expect(cache.get(obj1)).resolves.toEqual(value1)

  await cache.set(obj2, value2)
  await expect(cache.get(obj1)).resolves.toEqual(value1)
  await expect(cache.get(obj2)).resolves.toEqual(value2)

  await cache.set(obj3, value3)
  await expect(cache.get(obj1)).resolves.toEqual(value1)
  await expect(cache.get(obj3)).resolves.toEqual(value3)
  await expect(cache.get(obj1)).resolves.toEqual(value3)

  await cache.flush()
  await cache.close()
})

test(`getCacheKey`, async () => {
  expect(getCacheKey({ foo: 'bar' })).toEqual(getCacheKey({ foo: 'bar' }))
  expect(getCacheKey({ foo: 'bar' })).toEqual(
    getCacheKey({ foo: 'bar', baz: undefined })
  )

  expect(
    getCacheKey({
      foo: 'bar',
      bar: [1, 2, { a: -1.4, nala: 'cat' }],
      dog: false
    })
  ).toEqual(
    getCacheKey({
      dog: false,
      foo: 'bar',
      bar: [1, 2, { nala: 'cat', a: -1.4 }]
    })
  )
})
