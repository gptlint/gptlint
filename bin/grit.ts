#!/usr/bin/env node
import 'dotenv/config'

import { gracefulExit } from 'exit-hook'

import type * as types from '../src/types.js'
import { applyGritQLPattern, resolveGritQLMatches } from '../src/gritql.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { resolveFiles } from '../src/resolve-files.js'
import { logDebugConfig, omit } from '../src/utils.js'

/**
 * Internal CLI for testing GritQL.
 */
async function main() {
  const cwd = process.cwd()

  const { args, linterConfig: config } = await resolveLinterCLIConfig(
    process.argv,
    {
      name: 'grit',
      cwd,
      flagsToAdd: {
        pattern: {
          type: String,
          description: 'GritQL pattern',
          alias: 'p'
        }
      }
    }
  )

  const pattern = (args.flags as any).pattern

  if (!pattern) {
    console.error('Error must specify a gritql --pattern\n')
    args.showHelp()
    return gracefulExit(1)
  }

  let files: types.SourceFile[]

  try {
    files = await resolveFiles({ cwd, config })
  } catch (err: any) {
    console.error('Error:', err.message, '\n')
    args.showHelp()
    return gracefulExit(1)
  }

  if (config.linterOptions.printConfig) {
    logDebugConfig({ files, config })
    return gracefulExit(0)
  }

  const gritMatches = await applyGritQLPattern(pattern, { files })
  // const match = gritMatches.map(({ debug: _debug, ...match }) => match).at(-1)
  const partialFiles = resolveGritQLMatches(gritMatches, { files })
  const partialFilesC = partialFiles.filter(
    (file) => file.ranges.length > 0 && file.partialContent.length > 0
  )
  console.log(
    JSON.stringify(
      partialFilesC.map((f) => omit(f, 'content', 'ranges')),
      null,
      2
    )
  )
}

try {
  await main()
} catch (err) {
  console.error(err)
  gracefulExit(1)
}
