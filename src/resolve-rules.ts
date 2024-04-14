import fs from 'node:fs/promises'
import path from 'node:path'

import pMap from 'p-map'

import type * as types from './types.js'
import { parseRuleFile } from './parse-rule-file.js'
import { RuleDefinitionSchema } from './rule.js'
import { isValidRuleName, validateRule } from './rule-utils.js'
import { assert, resolveGlobFilePatterns } from './utils.js'

export async function resolveRules({
  config,
  cwd = process.cwd()
}: {
  config: types.ResolvedLinterConfig
  cwd?: string
}): Promise<types.Rule[]> {
  const ruleFilePaths = await resolveGlobFilePatterns(config.ruleFiles ?? [], {
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
          ...parsedRule.data,
          source: 'custom',
          cacheable: true,
          metadata: {}
        }

        assert(
          isValidRuleName(rule.name),
          `Invalid custom rule name "${rule.name}"`
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
    rule = validateRule(rule)

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
    // TODO: should this happen here or in `lintFiles`?
    rules = rules.filter((rule) => config.rules[rule.name] !== 'off')
  }

  return rules
}
