import path from 'node:path'

import { cli } from 'cleye'
import 'dotenv/config'
import fs from 'fs/promises'
import { globby } from 'globby'

import type * as types from '../src/types.js'
import { lintFiles } from '../src/linter.js'
import { parseGuidelines } from '../src/parse-guidelines.js'

async function main() {
  const args = cli(
    {
      name: 'lint',
      parameters: ['[file/dir/glob ...]'],
      flags: {
        guidelines: {
          type: String,
          description: 'Path to the rules markdown file',
          alias: 'r',
          default: 'guidelines.md'
        },
        ignoreFile: {
          type: String,
          description: 'Path of ignore file'
          // TODO
          // default: '.eslint++ignore'
        },
        ignorePattern: {
          type: [String],
          // TODO: add  (in addition to those in .eslintignore) depending on what we call the project
          description: 'Pattern of files to ignore'
        },
        noIgnore: {
          type: Boolean,
          description: 'Disable use of ignore files and patterns',
          default: false
        },
        debug: {
          type: Boolean,
          description: 'Enables debug logging',
          default: false,
          alias: 'd'
        },
        earlyExit: {
          type: Boolean,
          description: 'Exits after finding the first error',
          default: false,
          alias: 'e'
        }
      }
    },
    () => {},
    process.argv
  )

  const rulesFile = await fs.readFile(args.flags.guidelines, 'utf-8')
  let guidelines: types.Rule[] = []

  try {
    guidelines = await parseGuidelines(rulesFile)

    // console.log(JSON.stringify(guidelines, null, 2))
  } catch (err: any) {
    console.error(
      `Error parsing guidelines file "${args.flags.guidelines}"`,
      err.message
    )
    console.log()
    args.showHelp()
    process.exit(1)
  }

  let inputFilePatterns = args._.fileDirGlob.slice(2)
  if (!inputFilePatterns.length) {
    inputFilePatterns = ['**/*.{js,ts,jsx,tsx,cjs,mjs}']
  }

  const cwd = process.cwd()
  const inputFiles = (
    await globby(inputFilePatterns, {
      gitignore: true,
      ignore: args.flags.noIgnore ? undefined : args.flags.ignorePattern,
      cwd
    })
  ).map((filePath) => path.join(cwd, filePath))

  const lintErrors = await lintFiles({
    inputFiles,
    guidelines,
    earlyExit: args.flags.earlyExit,
    debug: args.flags.debug
  })

  if (lintErrors.length > 0) {
    console.log('\nlint errors:', JSON.stringify(lintErrors, null, 2))
    process.exit(1)
  } else {
    console.log('\nno lint errors – huzzah!')
    process.exit(0)
  }

  return lintErrors
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
