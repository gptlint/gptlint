#!/usr/bin/env node
import 'dotenv/config'

import path from 'node:path'

import { gracefulExit } from 'exit-hook'
import pMap from 'p-map'

import type * as types from '../src/types.js'
import { createLinterCache } from '../src/cache.js'
import { createChatModel } from '../src/create-chat-model.js'
import { lintFile } from '../src/lint-file.js'
import { createLintResult, mergeLintResults } from '../src/lint-result.js'
import { resolveLinterCLIConfig } from '../src/resolve-cli-config.js'
import { readSourceFiles } from '../src/resolve-files.js'
import { resolveRules } from '../src/resolve-rules.js'
import {
  createEvalStats,
  logDebugConfig,
  logEvalStats,
  logLintResultStats,
  mergeEvalStats,
  resolveGlobFilePatterns
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
      name: 'run-evals',
      cwd,
      linterConfigDefaults: {
        llmOptions: {
          // Use GPT-4 as the default for evals
          model: 'gpt-4-turbo-preview'
        }
      },
      flagsToAdd: {
        onlyPositive: {
          type: Boolean,
          description: 'Only generate positive examples',
          default: false
        },
        onlyNegative: {
          type: Boolean,
          description: 'Only generate negative examples',
          default: false
        }
      }
    }
  )

  const onlyPositive = !!(args.flags as any).onlyPositive
  const onlyNegative = !!(args.flags as any).onlyNegative

  if (onlyPositive && onlyNegative) {
    console.error('Cannot specify both --only-positive and --only-negative')
    args.showHelp()
    return gracefulExit(1)
  }

  let rules: types.Rule[]

  try {
    rules = await resolveRules({ cwd, config })
  } catch (err: any) {
    console.error('Error:', err.message, '\n')
    args.showHelp()
    return gracefulExit(1)
  }

  // TODO
  rules = rules.filter(
    (rule) => rule.scope === 'file' && rule.description?.trim()
  )

  if (config.linterOptions.printConfig) {
    logDebugConfig({ rules, config })
    return gracefulExit(0)
  }

  const chatModel = createChatModel(config)
  const cache = await createLinterCache(config)

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

      if (!onlyNegative) {
        // Positive examples
        const fileExamplesGlob = path.join(ruleExamplesDir, 'correct', '*')
        const exampleFiles = await resolveGlobFilePatterns(fileExamplesGlob, {
          gitignore: true,
          cwd
        })
        const files = await readSourceFiles(exampleFiles, { cwd })

        await pMap(
          files,
          async function lint(file) {
            try {
              const fileLintResult = await lintFile({
                file,
                rule,
                chatModel,
                cache,
                config,
                cwd
              })

              ++ruleEvalStats.numFiles
              if (fileLintResult.lintErrors.length > 0) {
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
            concurrency: 8
          }
        )
      }

      if (!onlyPositive) {
        // Negative examples
        const fileExamplesGlob = path.join(ruleExamplesDir, 'incorrect', '*')
        const exampleFiles = await resolveGlobFilePatterns(fileExamplesGlob, {
          gitignore: true,
          cwd
        })
        const files = await readSourceFiles(exampleFiles, { cwd })

        await pMap(
          files,
          async function lint(file) {
            try {
              const fileLintResult = await lintFile({
                file,
                rule,
                chatModel,
                cache,
                config,
                cwd
              })

              ++ruleEvalStats.numFiles
              if (fileLintResult.lintErrors.length > 0) {
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
            concurrency: 8
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
    logLintResultStats({ lintResult: globalLintResult, config, prefix: '\n' })
  }

  logEvalStats({ evalStats: globalEvalStats })
}

try {
  await main()
} catch (err) {
  console.error('Unexpected error', err)
  gracefulExit(1)
}
