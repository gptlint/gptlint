import fs from 'node:fs/promises'
import path from 'node:path'

import { execa } from 'execa'
import { packageDirectory } from 'pkg-dir'
import plur from 'plur'
import which from 'which'

import type * as types from './types.js'
import * as constants from './constants.js'
import { createLintResult } from './lint-result.js'
import { assert, dirname } from './utils.js'

/**
 * Resolves a GritQL pattern against the given source files and then resolves
 * the matches to construct partial source files containing only the matched
 * portions.
 */
export async function resolveGritQLPattern(
  pattern: string,
  {
    files,
    numLinesContext = constants.gritNumLinesContext
  }: {
    files: types.SourceFile[]
    // Number of lines of context to include around each matching range
    numLinesContext?: number
  }
): Promise<Map<string, types.PartialSourceFile>> {
  if (!(await hasGrit())) {
    return new Map()
  }

  const matches = await applyGritQLPattern(pattern, { files })
  return resolveGritQLMatches(matches, { files, numLinesContext })
}
