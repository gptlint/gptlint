import { readFile } from 'node:fs/promises'

import { cli } from 'cleye'
import parseGitIgnore from 'parse-gitignore'
import { pathExists } from 'path-exists'

import type * as types from './types.js'
import { defaultLinterConfig, parseLinterConfig } from './config.js'
import { resolveLinterConfig } from './resolve-config.js'
import { omit } from './utils.js'

const defaultCLIFlags: Readonly<types.CLIFlags> = {
  config: {
    type: String,
    description: 'Path to a configuration file',
    alias: 'c'
  },
  guidelines: {
    type: [String],
    description:
      'Glob pattern to guideline markdown files containing rule definitions',
    alias: 'g'
  },
  rules: {
    type: [String],
    description: 'Glob pattern to rule definition markdown files.',
    alias: 'r',
    default: ['guidelines/**/*.md']
  },
  ignoreFile: {
    type: String,
    description: 'Path to file containing ignore patterns',
    default: '.gptlintignore'
  },
  ignorePattern: {
    type: [String],
    description: 'Pattern of files to ignore (in addition to .gptlintignore)'
  },
  noIgnore: {
    type: Boolean,
    description: 'Disables the use of ignore files and patterns'
  },
  noInlineConfig: {
    type: Boolean,
    description: 'Disables the use of inline rule config inside of source files'
  },
  noCache: {
    type: Boolean,
    description: 'Disables caching',
    alias: 'C'
  },
  cacheDir: {
    type: String,
    description: 'Customize the path to the cache directory',
    default: defaultLinterConfig.linterOptions.cacheDir
  },
  concurrency: {
    type: Number,
    description: 'Limits the maximum number of concurrent tasks',
    default: 16
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
    description: 'Enables verbose LLM logging',
    alias: 'D'
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
    alias: 'k',
    default: defaultLinterConfig.llmOptions.apiKey
  },
  apiOrganizationId: {
    type: String,
    description:
      'Optional organization ID that should be billed for LLM API requests. This is only necessary if your OpenAI API key is scoped to multiple organizations.',
    default: defaultLinterConfig.llmOptions.apiOrganizationId
  },
  apiBaseUrl: {
    type: String,
    description:
      'Base URL for the LLM API to use which must be compatible with the OpenAI chat completions API. Defaults to the OpenAI API',
    default: defaultLinterConfig.llmOptions.apiBaseUrl
  },
  model: {
    type: String,
    description: 'Which LLM to use for assessing rule conformance',
    alias: 'm',
    default: defaultLinterConfig.llmOptions.model
  },
  temperature: {
    type: Number,
    description: 'LLM temperature parameter',
    default: defaultLinterConfig.llmOptions.temperature
  }
} as const

export async function resolveLinterCLIConfig(
  cliArgs: string[],
  {
    name,
    cwd,
    linterConfigDefaults,
    flagsToOmit,
    flagsToAdd
  }: {
    name: string
    cwd: string
    linterConfigDefaults?: types.LinterConfig
    flagsToOmit?: string[]
    flagsToAdd?: types.CLIFlags
  }
) {
  const flags: types.CLIFlags = {
    ...omit<types.CLIFlags>(defaultCLIFlags, ...((flagsToOmit as any) ?? [])),
    ...flagsToAdd
  }

  const args = cli(
    {
      name,
      parameters: ['[file/dir/glob ...]'],
      flags
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
      const ignoreFileContent = await readFile(args.flags.ignoreFile, {
        encoding: 'utf-8'
      })
      // `parseGitIgnore` doesn't handle single-line ignore files correctly,
      // so this is a workaround to ensure it doesn't view the file content as
      // a valid filesystem path
      const ignoreFile = `\n${ignoreFileContent}\n`
      // `parseGitIgnore` types are incorrect
      const { patterns: ignoreFilePatterns } = parseGitIgnore(ignoreFile) as any
      ignores = ignores.concat(ignoreFilePatterns)
    }
  }

  // Resolve the linter config from the command-line only
  let linterConfig = parseLinterConfig({
    files,
    ignores,
    guidelineFiles: args.flags.guidelines,
    ruleFiles: args.flags.rules,
    linterOptions: {
      noInlineConfig: args.flags.noInlineConfig,
      earlyExit: args.flags.earlyExit,
      concurrency:
        args.flags.concurrency === undefined
          ? undefined
          : args.flags.concurrency,
      debug: args.flags.debug,
      debugConfig: args.flags.debugConfig,
      debugModel: args.flags.debugModel,
      debugStats:
        args.flags.noDebugStats === undefined
          ? undefined
          : !args.flags.noDebugStats,
      noCache: args.flags.noCache,
      cacheDir:
        args.flags.cacheDir === defaultLinterConfig.linterOptions.cacheDir
          ? undefined
          : args.flags.cacheDir
    },
    llmOptions: {
      model:
        args.flags.model === defaultLinterConfig.llmOptions.model
          ? undefined
          : args.flags.model,
      temperature:
        args.flags.temperature === defaultLinterConfig.llmOptions.temperature
          ? undefined
          : args.flags.temperature,
      apiKey:
        args.flags.apiKey === defaultLinterConfig.llmOptions.apiKey
          ? undefined
          : args.flags.apiKey,
      apiOrganizationId:
        args.flags.apiOrganizationId ===
        defaultLinterConfig.llmOptions.apiOrganizationId
          ? undefined
          : args.flags.apiOrganizationId,
      apiBaseUrl:
        args.flags.apiBaseUrl === defaultLinterConfig.llmOptions.apiBaseUrl
          ? undefined
          : args.flags.apiBaseUrl
    }
  })

  // Resolve any file-based linter config and merge it with the CLI-based config
  linterConfig = await resolveLinterConfig(linterConfig, {
    cwd,
    configFilePath: args.flags.config,
    linterConfigDefaults
  })

  return {
    args,
    linterConfig: linterConfig as types.ResolvedLinterConfig
  }
}
