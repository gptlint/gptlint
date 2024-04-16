import fs from 'node:fs/promises'
import path from 'node:path'

import pMap from 'p-map'
import plur from 'plur'

import type * as types from './types.js'
import { maxSourceFileLineLength, maxSourceFileNumLines } from './constants.js'
import { isValidSourceFile } from './is-valid-source-file.js'
import { resolveGlobFilePatterns } from './utils.js'

export async function resolveFiles({
  config,
  cwd = process.cwd()
}: {
  config: types.ResolvedLinterConfig
  cwd?: string
}) {
  const sourceFiles = await resolveGlobFilePatterns(config.files, {
    gitignore: true,
    ignore: config.ignores,
    cwd
  })

  if (!sourceFiles.length) {
    throw new Error('No source files found')
  }

  return readSourceFiles(sourceFiles, {
    concurrency: config.linterOptions.concurrency
  })
}

export async function resolveEvalFiles({
  config,
  cwd = process.cwd()
}: {
  config: types.ResolvedLinterConfig
  cwd?: string
}) {
  const sourceFiles = await resolveGlobFilePatterns(config.files, {
    gitignore: false,
    ignore: config.ignores
      .filter((ignore) => !/fixtures/.test(ignore))
      .concat(['node_modules', 'dist', 'docs', '.env', '.next']),
    cwd
  })

  if (!sourceFiles.length) {
    throw new Error('No source files found')
  }

  return readSourceFiles(sourceFiles, {
    concurrency: config.linterOptions.concurrency
  })
}

export async function readSourceFiles(
  filePaths: string[],
  {
    concurrency = 32,
    cwd = process.cwd(),
    minFileSizeBytes,
    maxFileSizeBytes,
    maxFileNumLines = maxSourceFileNumLines,
    maxFileLineLength = maxSourceFileLineLength
  }: {
    concurrency?: number
    cwd?: string
    minFileSizeBytes?: number
    maxFileSizeBytes?: number
    maxFileNumLines?: number
    maxFileLineLength?: number
  } = {}
): Promise<types.SourceFile[]> {
  // Ensure that we always resolve files in a deterministic order
  filePaths.sort((a, b) => b.localeCompare(a))

  return (
    await pMap(
      filePaths,
      async (filePath) => {
        filePath = path.resolve(cwd, filePath)

        if (
          !(await isValidSourceFile(filePath, {
            minFileSizeBytes,
            maxFileSizeBytes
          }))
        ) {
          // Ignore invalid source files (e.g. binary files, empty files, etc.)
          console.warn(`Ignoring invalid source file: ${filePath}`)
          return
        }

        let content = await fs.readFile(filePath, { encoding: 'utf8' })
        if (!content.trim()) {
          // Ignore empty files
          console.warn(`Ignoring empty source file: ${filePath}`)
          return
        }

        let lines = content.split(/\r?\n/)

        if (lines.length > maxFileNumLines) {
          // Ignore files with too many lines of code
          console.warn(
            `Ignoring source file with too many lines: ${filePath} (${lines.length} is more than the configured limit ${maxFileNumLines})`
          )
          return
        }

        let numLongLines = 0
        lines = lines.map((line) => {
          if (line.length > maxFileLineLength) {
            ++numLongLines

            // Truncate lines which are too long
            return line.slice(0, maxFileLineLength)
          } else {
            return line
          }
        })

        if (numLongLines > 1) {
          // Ignore files with too many long lines of code
          console.warn(
            `Ignoring source file with ${numLongLines} long ${plur('line', numLongLines)}: ${filePath} (a long line has at least ${maxFileLineLength} characters, and a file can have at most 1 long line which will be truncated)`
          )
          return
        }

        if (numLongLines > 0) {
          content = lines.join('\n')
        }

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
  ).filter(Boolean)
}
