import fs from 'node:fs/promises'
import path from 'node:path'

import { globby } from 'globby'
import pMap from 'p-map'

import type * as types from './types.js'
import { parseGuidelinesFile } from './parse-guidelines-file.js'
import { parseRuleFile } from './parse-rule-file.js'

export async function resolveRules({
  config,
  cwd
}: {
  config: types.ResolvedLinterConfig
  cwd: string
}) {
  const guidelineFilePaths = await globby(config.guidelineFiles, {
    gitignore: true,
    cwd
  })

  const ruleFilePaths = await globby(config.ruleFiles, {
    gitignore: true,
    cwd
  })

  const processedGuidelineFilePaths = new Set<string>()
  const processedRuleFilePaths = new Set<string>()
  let rules: types.Rule[] = []

  // Parse any project-specific guideline files
  rules = (
    await pMap(
      guidelineFilePaths,
      async (guidelineFilePath) => {
        try {
          if (processedGuidelineFilePaths.has(guidelineFilePath)) {
            return
          }
          processedGuidelineFilePaths.add(guidelineFilePath)

          const guidelineFilePathAbsolute = path.join(cwd, guidelineFilePath)
          const guidelineFileContent = await fs.readFile(
            guidelineFilePathAbsolute,
            'utf-8'
          )

          const rules = await parseGuidelinesFile({
            content: guidelineFileContent,
            filePath: guidelineFilePath
          })

          // console.log(JSON.stringify(rules, null, 2))
          return rules
        } catch (err: any) {
          throw new Error(
            `Error parsing guidelines file "${guidelineFilePath}": ${err.message}`,
            { cause: err }
          )
        }
      },
      {
        concurrency: config.linterOptions.concurrency
      }
    )
  )
    .filter(Boolean)
    .flat()

  // Parse any project-specific rule files
  rules = rules.concat(
    (
      await pMap(
        ruleFilePaths,
        async (ruleFilePath) => {
          try {
            if (processedRuleFilePaths.has(ruleFilePath)) {
              return
            }
            processedRuleFilePaths.add(ruleFilePath)

            if (processedGuidelineFilePaths.has(ruleFilePath)) {
              throw new Error(
                'File cannot be included as both a guidelines markdown file and an individual rule markdown file'
              )
            }

            const ruleFilePathAbsolute = path.join(cwd, ruleFilePath)
            const ruleFileContent = await fs.readFile(
              ruleFilePathAbsolute,
              'utf-8'
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
  )

  const processedRules = new Set<string>()

  // TODO: validate rules for duplicates and malformed rules
  for (const rule of rules) {
    if (processedRules.has(rule.name)) {
      throw new Error(`Duplicate rule found "${rule.name}"`)
    }

    processedRules.add(rule.name)

    // TODO: validate rule
  }

  if (config.rules) {
    // Remove rules which have been disabled in the config
    rules = rules.filter((rule) => config.rules[rule.name] !== 'off')
  }

  return rules
}
