#!/usr/bin/env node
import 'dotenv/config'

import { gracefulExit } from 'exit-hook'
import plur from 'plur'

import type * as types from '../src/types.js'
import { createLinterCache } from '../src/cache.js'
import { createChatModel } from '../src/create-chat-model.js'
import { lintFiles } from '../src/lint-files.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { resolveFiles } from '../src/resolve-files.js'
import { resolveRules } from '../src/resolve-rules.js'
import { logDebugConfig, logLintResultStats } from '../src/utils.js'

/**
 * Main CLI entrypoint.
 */
async function main() {
  const cwd = process.cwd()

  const { args, linterConfig: config } = await resolveLinterCLIConfig(
    process.argv,
    {
      name: 'gptlint',
      cwd
    }
  )

  let files: types.SourceFile[]
  let rules: types.Rule[]

  try {
    ;[files, rules] = await Promise.all([
      resolveFiles({ cwd, config }),
      resolveRules({ cwd, config })
    ])
  } catch (err: any) {
    console.error('Error:', err.message, '\n')
    args.showHelp()
    return gracefulExit(1)
  }

  if (config.linterOptions.printConfig) {
    logDebugConfig({ files, rules, config })
    return gracefulExit(0)
  }

  const chatModel = createChatModel(config)
  const cache = await createLinterCache(config)

  const lintResult = await lintFiles({
    files,
    rules,
    config,
    cache,
    chatModel
  })

  if (config.linterOptions.debugStats) {
    logLintResultStats({ lintResult, config })
  }

  if (lintResult.lintErrors.length > 0) {
    console.log(
      `\nlint errors:`,
      JSON.stringify(lintResult.lintErrors, undefined, 2)
    )

    console.log(
      `\nfound ${lintResult.lintErrors.length} lint ${plur(
        'error',
        lintResult.lintErrors.length
      )}`
    )

    return gracefulExit(1)
  } else {
    console.log('\nno lint errors 🎉')
    return gracefulExit(0)
  }
}

try {
  await main()
} catch (err) {
  console.error('Unexpected error', err)
  gracefulExit(1)
}
