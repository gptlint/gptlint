import fs from 'node:fs/promises'
import path from 'node:path'

import { globby } from 'globby'
import pMap from 'p-map'

import type * as types from './types.js'
import { parseRuleFile } from './parse-rule-file.js'

export async function resolveRules({
  config,
  cwd = process.cwd()
}: {
  config: types.ResolvedLinterConfig
  cwd?: string
}) {
  const ruleFilePaths = await globby(config.ruleFiles, {
    gitignore: true,
    cwd
  })

  const processedRuleFilePaths = new Set<string>()

  // Parse any project-specific rule files
  let rules = (
    await pMap(
      ruleFilePaths,
      async (ruleFilePath) => {
        try {
          if (processedRuleFilePaths.has(ruleFilePath)) {
            return
          }
          processedRuleFilePaths.add(ruleFilePath)

          const ruleFilePathAbsolute = path.join(cwd, ruleFilePath)
          const ruleFileContent = await fs.readFile(
            ruleFilePathAbsolute,
            'utf8'
          )
          const rule = await parseRuleFile({
            content: ruleFileContent,
            filePath: ruleFilePath
          })

          return rule
        } catch (err: any) {
          throw new Error(
            `Error parsing rule file "${ruleFilePath}": ${err.message}`,
            { cause: err }
          )
        }
      },
      {
        concurrency: config.linterOptions.concurrency
      }
    )
  ).filter(Boolean)

  const processedRules = new Set<string>()

  // Validate rules for duplicates
  for (const rule of rules) {
    if (processedRules.has(rule.name)) {
      throw new Error(`Duplicate rule found "${rule.name}"`)
    }

    processedRules.add(rule.name)

    // TODO: validate rule
  }

  if (!rules.length) {
    throw new Error('No rules found')
  }

  if (config.rules) {
    // Remove rules which have been disabled in the config
    rules = rules.filter((rule) => config.rules[rule.name] !== 'off')
  }

  return rules
}
