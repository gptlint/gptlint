import fs from 'node:fs/promises'
import path from 'node:path'

import { maxSourceFileSizeBytes, minSourceFileSizeBytes } from './constants.js'
import { isBinaryFile } from './is-binary-file.js'

const knownGeneratedFileNames = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb'
])

export async function isValidSourceFile(
  filePath: string,
  {
    minFileSizeBytes = minSourceFileSizeBytes,
    maxFileSizeBytes = maxSourceFileSizeBytes
  }: {
    minFileSizeBytes?: number
    maxFileSizeBytes?: number
  } = {}
): Promise<boolean> {
  try {
    if (!filePath) {
      // Ignore invalid file paths
      return false
    }

    const fileName = path.basename(filePath)
    if (!fileName) {
      // Ignore invalid file paths
      return false
    }

    if (knownGeneratedFileNames.has(fileName)) {
      // Ignore known generated files
      return false
    }

    const stats = await fs.stat(filePath)

    if (!stats.isFile()) {
      // Ignore non-files
      return false
    }

    if (stats.size <= minFileSizeBytes || stats.size > maxFileSizeBytes) {
      // Ignore empty files
      return false
    }

    if (stats.size > maxFileSizeBytes) {
      // Ignore large files
      return false
    }

    if (await isBinaryFile(filePath)) {
      // Ignore binary files
      return false
    }

    // File is valid
    return true
  } catch (err: any) {
    throw new Error(`Error reading file: ${filePath}: ${err.message}`, {
      cause: err
    })
  }
}
