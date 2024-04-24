import { readFile } from 'node:fs/promises'

import { cli } from 'cleye'
import { gracefulExit } from 'exit-hook'
import parseGitIgnore from 'parse-gitignore'
import { pathExists } from 'path-exists'
import plur from 'plur'

import type * as types from './types.js'
import { parseLinterConfig } from './config.js'
import { resolveLinterConfig } from './resolve-config.js'

export async function resolveLinterCLIConfig(
  cliArgs: string[],
  {
    name,
    cwd,
    linterConfigDefaults,
    flagsToAdd
  }: {
    name: string
    cwd: string
    linterConfigDefaults?: types.LinterConfig
    flagsToOmit?: string[]
    flagsToAdd?: types.CLIFlags
  }
) {
  const args = cli(
    {
      name,
      parameters: ['[file/dir/glob ...]'],
      flags: {
        ...flagsToAdd,
        config: {
          type: String,
          description: 'Path to a configuration file',
          alias: 'c'
        },
        rules: {
          type: [String],
          description: 'Glob pattern to rule definition markdown files.',
          alias: 'r'
        },
        ignoreFile: {
          type: String,
          description: 'Path to file containing ignore patterns',
          default: '.gptlintignore'
        },
        ignorePattern: {
          type: [String],
          description:
            'Pattern of files to ignore (in addition to .gptlintignore)'
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
          description: 'Disables caching',
          alias: 'C'
        },
        noGrit: {
          type: Boolean,
          description: 'Disables grit',
          alias: 'G'
        },
        cacheDir: {
          type: String,
          description: 'Customize the path to the cache directory'
        },
        dotenvPath: {
          type: String,
          description: 'Customize the path to the .env file'
        },
        concurrency: {
          type: Number,
          description: 'Limits the maximum number of concurrent tasks'
        },
        debug: {
          type: Boolean,
          description: 'Enables debug logging',
          alias: 'd'
        },
        dryRun: {
          type: Boolean,
          description:
            'Disables all external LLM calls and outputs an estimate of what it would cost to run the linter on the given config'
        },
        printConfig: {
          type: Boolean,
          description:
            'When enabled, logs the resolved config and parsed rules and then exits'
        },
        debugModel: {
          type: Boolean,
          description: 'Enables verbose LLM logging',
          alias: 'D'
        },
        debugGrit: {
          type: Boolean,
          description: 'Enables verbose Grit logging',
          alias: 'g'
        },
        noDebugStats: {
          type: Boolean,
          description:
            'Disables logging of cumulative LLM stats, including total tokens and cost (logging LLM stats is enabled by default)',
          alias: 'S'
        },
        earlyExit: {
          type: Boolean,
          description: 'Exits after finding the first error',
          alias: 'e'
        },
        apiKey: {
          type: String,
          description:
            'API key for the OpenAI-compatible LLM API. Defaults to the value of the `OPENAI_API_KEY` environment variable.',
          alias: 'k'
        },
        apiOrganizationId: {
          type: String,
          description:
            'Optional organization ID that should be billed for LLM API requests. This is only necessary if your OpenAI API key is scoped to multiple organizations.'
        },
        apiBaseUrl: {
          type: String,
          description:
            'Base URL for the LLM API to use which must be compatible with the OpenAI chat completions API. Defaults to the OpenAI API.'
        },
        model: {
          type: String,
          description:
            'Which LLM to use for assessing rule conformance. Defaults to gpt-4.',
          alias: 'm'
        },
        weakModel: {
          type: String,
          description:
            'Which weak LLM to use for assessing rule conformance (optional; used for multi-pass linting; set to "none" to disable two-pass linting). Defaults to gpt-3.5-turbo.',
          alias: 'M'
        },
        temperature: {
          type: Number,
          description: 'LLM temperature parameter'
        }
      }
    },
    () => {},
    cliArgs
  )

  if (Object.keys(args.unknownFlags).length > 0) {
    const message = `Error unknown ${plur('flag', Object.keys(args.unknownFlags).length)}: ${Object.keys(args.unknownFlags).join(', ')}`
    console.error(`${message}\n`)

    args.showHelp()
    gracefulExit(1)

    throw new Error(message)
  }

  const files = args._.fileDirGlob.slice(2)
  // if (files.length === 0) {
  //   files = ['**/*.{js,ts,jsx,tsx,cjs,mjs}']
  // }

  let ignores = args.flags.noIgnore ? [] : args.flags.ignorePattern
  if (args.flags.ignoreFile && !args.flags.noIgnore) {
    if (await pathExists(args.flags.ignoreFile)) {
      const ignoreFileContent = await readFile(args.flags.ignoreFile, {
        encoding: 'utf8'
      })
      // `parseGitIgnore` doesn't handle single-line ignore files correctly,
      // so this is a workaround to ensure it doesn't view the file content as
      // a valid filesystem path
      const ignoreFile = `\n${ignoreFileContent}\n`

      // `parseGitIgnore` types are incorrect, so this is a workaround
      const { patterns: ignoreFilePatterns } = parseGitIgnore(ignoreFile) as any
      ignores = ignores.concat(ignoreFilePatterns)
    }
  }

  // Resolve the linter config from the command-line only
  const cliLinterConfig = parseLinterConfig({
    files: files.length > 0 ? files : undefined,
    ignores: ignores.length > 0 ? ignores : undefined,
    ruleFiles: args.flags.rules.length > 0 ? args.flags.rules : undefined,
    dotenvPath: args.flags.dotenvPath,
    linterOptions: {
      noInlineConfig: args.flags.noInlineConfig,
      earlyExit: args.flags.earlyExit,
      concurrency: args.flags.concurrency,
      debug: args.flags.debug,
      printConfig: args.flags.printConfig,
      debugModel: args.flags.debugModel,
      debugGrit: args.flags.debugGrit,
      debugStats:
        args.flags.noDebugStats === undefined
          ? undefined
          : !args.flags.noDebugStats,
      noCache: args.flags.noCache,
      noGrit: args.flags.noGrit,
      dryRun: args.flags.dryRun,
      cacheDir: args.flags.cacheDir
    },
    llmOptions: {
      model: args.flags.model,
      weakModel: args.flags.weakModel,
      temperature: args.flags.temperature,
      apiKey: args.flags.apiKey,
      apiOrganizationId: args.flags.apiOrganizationId,
      apiBaseUrl: args.flags.apiBaseUrl
    }
  })

  // Resolve file-based linter config and merge it with the CLI-based config
  const linterConfig = await resolveLinterConfig(cliLinterConfig, {
    cwd,
    configFilePath: args.flags.config,
    linterConfigDefaults
  })

  return {
    args,
    linterConfig
  }
}
