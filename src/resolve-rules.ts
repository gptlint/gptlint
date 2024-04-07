import fs from 'node:fs/promises'
import path from 'node:path'

import { globby } from 'globby'
import pMap from 'p-map'

import type * as types from './types.js'
import { RuleDefinitionSchema } from './config.js'
import { parseRuleFile } from './parse-rule-file.js'
import { assert, isValidRuleName, isValidRuleSetting } from './utils.js'

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

  const customRules: types.Rule[] = (config.ruleDefinitions ?? []).map(
    (ruleDefinition) => {
      const parsedRule = RuleDefinitionSchema.safeParse(ruleDefinition)

      if (parsedRule.success) {
        const rule: types.Rule = {
          desc: 'Custom rule',
          level: 'error',
          fixable: false,
          ...parsedRule.data
        }

        assert(
          isValidRuleName(rule.name),
          `Invalid custom rule name "${rule.name}"`
        )

        assert(
          isValidRuleSetting(rule.level!),
          `Invalid custom rule level "${rule.level!}"`
        )

        return rule
      } else {
        throw new Error(
          `Error parsing custom rule "${ruleDefinition.name}": ${parsedRule.error.message}`
        )
      }
    }
  )

  // Custom rules should always go first because they may import other rule
  // markdown files, and we want the custom rules to take precedence
  rules = customRules.concat(rules)

  const processedRules = new Set<string>()

  rules = rules.filter((rule) => {
    assert(isValidRuleName(rule.name), `Invalid rule name "${rule.name}"`)

    if (processedRules.has(rule.name)) {
      return false
    }

    processedRules.add(rule.name)
    return true
  })

  if (!rules.length) {
    throw new Error('No rules found')
  }

  if (config.rules) {
    // Remove rules which have been disabled in the config
    rules = rules.filter((rule) => config.rules[rule.name] !== 'off')
  }

  return rules
}
