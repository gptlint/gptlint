import { readFile } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'

import pMap from 'p-map'

import type * as types from './types.js'

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
      filePath = resolve(cwd, filePath)
      const content = await readFile(filePath, { encoding: 'utf-8' })

      const fileRelativePath = relative(cwd, filePath)
      const fileName = basename(filePath)
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
