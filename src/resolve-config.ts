import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { cli } from 'cleye'
import parseGitIgnore from 'parse-gitignore'

import type * as types from './types.js'
import {
  defaultLinterConfig,
  mergeLinterConfigs,
  parseLinterConfig
} from './config.js'

export async function resolveLinterConfig(
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
          description: 'Disables the built-in cache'
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
            'When enabled, logs the resolved config and parsed rules and then exits',
          alias: 'D'
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
    const ignoreFile = await readFile(args.flags.ignoreFile, {
      encoding: 'utf-8'
    })
    const ignoreFilePatterns: string[] = parseGitIgnore(ignoreFile)
    ignores = ignores.concat(ignoreFilePatterns)
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

  const configsToCheck = [
    args.flags.config,
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs'
  ].filter(Boolean)

  for (const configFileRelativePath of configsToCheck) {
    const configFilePath = path.resolve(cwd, configFileRelativePath)

    if (!(await stat(configFilePath))) {
      if (configFileRelativePath === args.flags.config) {
        throw new Error(`Error missing config file "${args.flags.config}"`)
      }

      continue
    }

    const { default: rawConfigs } = await import(configFilePath)

    // TODO: each of these sub-configs should only be enabled if `files` + `ignores` match, so it's not a strict merge
    for (const rawConfig of rawConfigs) {
      const config = parseLinterConfig(rawConfig)

      linterConfig = mergeLinterConfigs(config, linterConfig)
    }

    // Break after we find the first project config file
    break
  }

  linterConfig = mergeLinterConfigs(defaultLinterConfig, linterConfig)
  return {
    args,
    linterConfig: linterConfig as types.ResolvedLinterConfig
  }
}
