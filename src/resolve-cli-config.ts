import { readFile } from 'node:fs/promises'

import { cli } from 'cleye'
import parseGitIgnore from 'parse-gitignore'
import { pathExists } from 'path-exists'

import type * as types from './types.js'
import { defaultLinterConfig, parseLinterConfig } from './config.js'
import { resolveLinterConfig } from './resolve-config.js'

export async function resolveLinterCLIConfig(
  cliArgs: string[],
  { cwd }: { cwd: string }
) {
  const args = cli(
    {
      name: 'lint',
      parameters: ['[file/dir/glob ...]'],
      flags: {
        config: {
          type: String,
          description: 'Path to a configuration file',
          alias: 'c'
        },
        guidelines: {
          type: [String],
          description:
            'Glob pattern to guideline markdown files containing rule definitions',
          alias: 'g',
          default: ['guidelines.md']
        },
        rule: {
          type: [String],
          description: 'Glob pattern of rule definition markdown files.',
          alias: 'r'
        },
        ignoreFile: {
          type: String,
          description: 'Path to file containing ignore patterns',
          default: '.eslint-plus-plus-ignore'
        },
        ignorePattern: {
          type: [String],
          // TODO: add  (in addition to those in .eslintignore) depending on what we call the project
          description: 'Pattern of files to ignore'
        },
        noIgnore: {
          type: Boolean,
          description: 'Disables the use of ignore files and patterns'
        },
        noInlineConfig: {
          type: Boolean,
          description:
            'Disables the use of inline rule config inside of source files'
        },
        noCache: {
          type: Boolean,
          description: 'Disables the built-in cache',
          alias: 'C'
        },
        cacheDir: {
          type: String,
          description: 'Customize the path to the cache directory',
          default: defaultLinterConfig.linterOptions.cacheDir
        },
        debug: {
          type: Boolean,
          description: 'Enables debug logging',
          alias: 'd'
        },
        debugConfig: {
          type: Boolean,
          description:
            'When enabled, logs the resolved config and parsed rules and then exits'
        },
        debugModel: {
          type: Boolean,
          description: 'Enables verbose LLM debugging',
          alias: 'D'
        },
        debugStats: {
          type: Boolean,
          description:
            'Enables logging of cumulative LLM stats at the end (total tokens and cost)',
          alias: 'S'
        },
        earlyExit: {
          type: Boolean,
          description: 'Exits after finding the first error',
          alias: 'e'
        },
        model: {
          type: String,
          description: 'Which LLM to use for assessing rule conformance',
          default: defaultLinterConfig.linterOptions.model
        },
        temperature: {
          type: Number,
          description: 'LLM temperature parameter',
          default: defaultLinterConfig.linterOptions.temperature
        }
      }
    },
    () => {},
    cliArgs
  )

  let files = args._.fileDirGlob.slice(2)
  if (!files.length) {
    files = ['**/*.{js,ts,jsx,tsx,cjs,mjs}']
  }

  let ignores = args.flags.noIgnore ? [] : args.flags.ignorePattern
  if (args.flags.ignoreFile && !args.flags.noIgnore) {
    if (await pathExists(args.flags.ignoreFile)) {
      const ignoreFile = await readFile(args.flags.ignoreFile, {
        encoding: 'utf-8'
      })
      const ignoreFilePatterns: string[] = parseGitIgnore(ignoreFile)
      ignores = ignores.concat(ignoreFilePatterns)
    }
  }

  let linterConfig = parseLinterConfig({
    files,
    ignores,
    guidelineFiles: args.flags.guidelines,
    ruleFiles: args.flags.rule,
    linterOptions: {
      noInlineConfig: args.flags.noInlineConfig,
      earlyExit: args.flags.earlyExit,
      debug: args.flags.debug,
      debugConfig: args.flags.debugConfig,
      debugModel: args.flags.debugModel,
      debugStats: args.flags.debugStats,
      noCache: args.flags.noCache,
      cacheDir:
        args.flags.cacheDir === defaultLinterConfig.linterOptions.cacheDir
          ? undefined
          : args.flags.cacheDir,
      model:
        args.flags.model === defaultLinterConfig.linterOptions.model
          ? undefined
          : args.flags.model,
      temperature:
        args.flags.temperature === defaultLinterConfig.linterOptions.temperature
          ? undefined
          : args.flags.temperature
    }
  })

  linterConfig = await resolveLinterConfig(linterConfig, {
    cwd,
    configFilePath: args.flags.config
  })

  return {
    args,
    linterConfig: linterConfig as types.ResolvedLinterConfig
  }
}
