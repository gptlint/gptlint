#!/usr/bin/env node
import 'dotenv/config'

import { gracefulExit } from 'exit-hook'

import type * as types from '../src/types.js'
import { createEmbeddingModel } from '../src/create-embedding-model.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { resolveFiles } from '../src/resolve-files.js'
import { resolveRules } from '../src/resolve-rules.js'
import { logDebugConfig, omit } from '../src/utils.js'
import { connectToVectorDB, getFileTable } from '../src/vector-db.js'

/**
 * TODO
 */
async function main() {
  const cwd = process.cwd()

  const { args, linterConfig: config } = await resolveLinterCLIConfig(
    process.argv,
    {
      name: 'test-vector-db',
      cwd
    }
  )

  let files: types.SourceFile[]
  let rules: types.Rule[]

  try {
    ;[files, rules] = await Promise.all([
      resolveFiles({ cwd, config }),
      resolveRules({ cwd, config })
    ])
  } catch (err: any) {
    console.error('Error:', err.message, '\n')
    args.showHelp()
    return gracefulExit(1)
  }

  if (config.linterOptions.printConfig) {
    logDebugConfig({ rules, files, config })
    return gracefulExit(0)
  }

  const embeddingModel = createEmbeddingModel(config)

  const db = await connectToVectorDB(config.lanceDBOptions)
  const fileTable = await getFileTable(db)

  console.log('embedding', {
    numFiles: files.length
  })

  const embeddingsBatch = await embeddingModel.run({
    input: files.map((file) => file.content)
  })

  console.log('done embedding', {
    numFiles: files.length,
    cost: embeddingsBatch.cost,
    usage: embeddingsBatch.usage
  })

  const fileModels = files.map((file, index) => {
    const vector = embeddingsBatch.embeddings[index]!
    const fileModel: types.FileModel = {
      filePath: file.fileRelativePath,
      vector
    }

    return fileModel
  })

  console.log(fileModels)
  await fileTable.add(fileModels)

  const fileIndex = files.findIndex((file) => file.fileName === 'utils.test.ts')
  const vector = embeddingsBatch.embeddings[fileIndex]!
  fileTable.display()

  const results0 = (await fileTable
    .vectorSearch(vector)
    .limit(5)
    .toArray()) as types.FileModel[]
  const results = results0.map((row) => omit(row, 'vector'))
  console.log('results', results)
}

try {
  await main()
} catch (err) {
  console.error('Unexpected error', err)
  gracefulExit(1)
}
