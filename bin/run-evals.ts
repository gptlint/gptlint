#!/usr/bin/env node
import path from 'node:path'

import 'dotenv/config'
import { gracefulExit } from 'exit-hook'
import { globby } from 'globby'
import pMap from 'p-map'

import type * as types from '../src/types.js'
import { createChatModel } from '../src/create-chat-model.js'
import { lintFile } from '../src/lint-file.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { readFiles } from '../src/resolve-files.js'
import { resolveRules } from '../src/resolve-rules.js'
import {
  createEvalStats,
  createLintResult,
  logDebugConfig,
  logDebugStats,
  logEvalStats,
  mergeEvalStats,
  mergeLintResults
} from '../src/utils.js'

/**
 * Internal CLI to run the linter against synthetic, labeled code snippets in
 * order to estimate each rule's performance in terms of accuracy, precision,
 * and recall.
 */
async function main() {
  const cwd = process.cwd()

  const { args, linterConfig: config } = await resolveLinterCLIConfig(
    process.argv,
    {
      cwd,
      linterConfigDefaults: {
        llmOptions: {
          // Use GPT-4 as the default for evals
          model: 'gpt-4-turbo-preview'
        }
      }
    }
  )

  let rules: types.Rule[]

  try {
    rules = await resolveRules({ cwd, config })
  } catch (err: any) {
    console.error(err.message)
    args.showHelp()
    return gracefulExit(1)
  }

  if (config.linterOptions.debugConfig) {
    logDebugConfig({ rules, config })
    return gracefulExit(0)
  }

  const chatModel = createChatModel(config)

  const evalsDir = path.join('fixtures', 'evals')
  const ruleToEvalStats: Record<string, types.EvalStats> = {}
  let globalLintResult = createLintResult()
  let globalEvalStats = createEvalStats()

  await pMap(
    rules,
    async function generateEvalsForRule(rule) {
      const ruleExamplesDir = path.join(evalsDir, rule.name)
      const ruleEvalStats = createEvalStats()
      let ruleLintResult = createLintResult()

      {
        // Positive examples
        const fileExamplesGlob = path.join(ruleExamplesDir, 'correct', '*')
        const exampleFiles = await globby(fileExamplesGlob, {
          gitignore: true,
          cwd
        })
        const files = await readFiles(exampleFiles, { cwd })

        await pMap(
          files,
          async function lint(file) {
            try {
              const fileLintResult = await lintFile({
                file,
                rule,
                chatModel,
                config
              })

              ++ruleEvalStats.numFiles
              if (fileLintResult.lintErrors.length) {
                ruleEvalStats.numFalsePositives++

                console.warn(
                  `False positive: rule ${rule.name}: ${file.fileRelativePath}`,
                  fileLintResult.lintErrors
                )
              } else {
                ruleEvalStats.numTrueNegatives++

                console.log(
                  `True negative: rule ${rule.name}: ${file.fileRelativePath}`
                )
              }

              ruleLintResult = mergeLintResults(ruleLintResult, fileLintResult)
            } catch (err: any) {
              ruleEvalStats.numUnexpectedErrors++
              console.warn(
                `Unexpected error: rule ${rule.name}: ${file.fileRelativePath}`,
                err
              )
            }
          },
          {
            concurrency: 4
          }
        )
      }

      {
        // Negative examples
        const fileExamplesGlob = path.join(ruleExamplesDir, 'incorrect', '*')
        const exampleFiles = await globby(fileExamplesGlob, {
          gitignore: true,
          cwd
        })
        const files = await readFiles(exampleFiles, { cwd })

        await pMap(
          files,
          async function lint(file) {
            try {
              const fileLintResult = await lintFile({
                file,
                rule,
                chatModel,
                config
              })

              ++ruleEvalStats.numFiles
              if (fileLintResult.lintErrors.length) {
                ruleEvalStats.numTruePositives++

                console.log(
                  `True positive: rule ${rule.name}: ${file.fileRelativePath}`
                )
              } else {
                ruleEvalStats.numFalseNegatives++

                console.warn(
                  `False negative: rule ${rule.name}: ${file.fileRelativePath}`,
                  fileLintResult.message
                )
              }

              ruleLintResult = mergeLintResults(ruleLintResult, fileLintResult)
            } catch (err: any) {
              ruleEvalStats.numUnexpectedErrors++
              console.warn(
                `Unexpected error: rule ${rule.name}: ${file.fileRelativePath}`,
                err
              )
            }
          },
          {
            concurrency: 4
          }
        )
      }

      ++ruleEvalStats.numRules
      ruleToEvalStats[rule.name] = ruleEvalStats

      globalLintResult = mergeLintResults(globalLintResult, ruleLintResult)
      globalEvalStats = mergeEvalStats(globalEvalStats, ruleEvalStats)
    },
    {
      concurrency: 4
    }
  )

  if (config.linterOptions.debugStats) {
    logDebugStats({ lintResult: globalLintResult, config })
  }

  logEvalStats({ evalStats: globalEvalStats })
}

main().catch((err) => {
  console.error(err)
  return gracefulExit(1)
})
