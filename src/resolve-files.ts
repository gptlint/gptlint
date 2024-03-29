import fs from 'node:fs/promises'
import path from 'node:path'

import { globby } from 'globby'
import pMap from 'p-map'

import type * as types from './types.js'

export async function resolveFiles({
  config,
  cwd,
  concurrency = 16
}: {
  config: types.ResolvedLinterConfig
  cwd: string
  concurrency?: number
}) {
  const inputFiles = await globby(config.files, {
    gitignore: true,
    ignore: config.ignores,
    cwd
  })

  return readFiles(inputFiles, { concurrency })
}

export async function readFiles(
  filePaths: string[],
  {
    concurrency = 16,
    cwd = process.cwd()
  }: {
    concurrency?: number
    cwd?: string
  } = {}
): Promise<types.InputFile[]> {
  return pMap(
    filePaths,
    async (filePath) => {
      filePath = path.resolve(cwd, filePath)
      const content = await fs.readFile(filePath, { encoding: 'utf-8' })

      const fileRelativePath = path.relative(cwd, filePath)
      const fileName = path.basename(filePath)
      const ext = fileName.split('.').at(-1)?.toLowerCase() ?? ''
      const jsExtensions = new Set(['js', 'jsx', 'cjs', 'mjs'])
      const tsExtensions = new Set(['ts', 'tsx'])

      // TODO: improve filePath => language detection
      const language = jsExtensions.has(ext)
        ? 'javascript'
        : tsExtensions.has(ext)
        ? 'typescript'
        : 'unknown'

      return {
        filePath,
        fileRelativePath,
        fileName,
        language,
        content
      }
    },
    {
      concurrency
    }
  )
}
