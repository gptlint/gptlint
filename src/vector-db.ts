import lancedb from '@lancedb/lancedb'
import { Field, FixedSizeList, Float32, Schema, Utf8 } from 'apache-arrow'
import hashObject from 'hash-object'

import type * as types from './config.js'
import { assert, omit } from './utils.js'

export type FileModel = {
  filePath: string
  vector: number[]
}

const lanceDBOptionsToDB = new Map<string, lancedb.Connection>()
const fileTableName = 'files'
const numEmbeddingDimensions = 1536

export async function connectToVectorDB(
  options: types.ResolvedLanceDBOptions
): Promise<lancedb.Connection> {
  assert(options.uri, 'lancedb options.uri is required')
  const cacheKey = hashObject(options)
  const cachedDB = lanceDBOptionsToDB.get(cacheKey)
  if (cachedDB) return cachedDB

  const db = await lancedb.connect(options.uri, omit(options, 'uri'))
  lanceDBOptionsToDB.set(cacheKey, db)

  await upsertTables(db)
  return db
}

export async function upsertTables(db: lancedb.Connection) {
  const tableNames = new Set(await db.tableNames())

  if (!tableNames.has(fileTableName)) {
    const schema = new Schema([
      new Field('filePath', new Utf8(), true),
      new Field(
        'vector',
        new FixedSizeList(
          numEmbeddingDimensions,
          new Field('item', new Float32())
        ),
        true
      )
    ])

    await db.createEmptyTable(fileTableName, schema)
  }
}

export async function getFileTable(
  db: lancedb.Connection
): Promise<lancedb.Table> {
  return db.openTable(fileTableName)
}
