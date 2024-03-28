import type * as types from './types.js'
import { assert, isValidRuleName, isValidRuleSetting } from './utils.js'

export function parseInlineConfig({
  file
}: {
  file: Pick<types.InputFile, 'content' | 'fileRelativePath'>
}): types.LinterConfig | undefined {
  const rules: types.LinterConfig['rules'] = {}

  const inlineDisableRe = /\/\*+\s*eslint-disable\s*\*+\//gi
  const inlineEnableRe = /\/\*+\s*eslint-enable\s*\*+\//gi
  let lastDisableIndex = -1
  let lastEnableIndex = -1

  for (const match of file.content.matchAll(inlineDisableRe)) {
    lastDisableIndex = Math.max(lastDisableIndex, match.index)
  }

  for (const match of file.content.matchAll(inlineEnableRe)) {
    lastEnableIndex = Math.max(lastEnableIndex, match.index)
  }

  if (lastDisableIndex >= 0) {
    if (lastDisableIndex > lastEnableIndex) {
      // Linting has been disabled for this file
      return {
        linterOptions: {
          disabled: true
        }
      }
    }
  }

  const inlineConfigRe = /\/\*+\s*eslint\s+([^*]+)\s*\*+\//gi
  for (const match of file.content.matchAll(inlineConfigRe)) {
    const inlineConfig = match[1]?.trim()
    if (!inlineConfig) continue

    const inlineConfigParts = inlineConfig.split(',').map((c) => c.trim())
    for (const inlineConfigPart of inlineConfigParts) {
      const inlineConfigRuleSettingParts = inlineConfigPart
        .split(':')
        .map((c) => c.trim().toLowerCase())

      assert(
        inlineConfigRuleSettingParts.length === 2,
        `Invalid inline config setting "${inlineConfig}" (${file.fileRelativePath})`
      )

      const [ruleName, ruleSetting] = inlineConfigRuleSettingParts

      assert(
        isValidRuleName(ruleName!),
        `Invalid inline config setting "${inlineConfig}"; invalid rule name "${ruleName}" (${file.fileRelativePath})`
      )

      assert(
        isValidRuleSetting(ruleSetting!),
        `Invalid inline config setting "${inlineConfig}"; invalid rule setting "${ruleSetting}" (${file.fileRelativePath})`
      )

      rules[ruleName] = ruleSetting
    }
  }

  if (Object.keys(rules).length > 0) {
    return { rules }
  }
}
