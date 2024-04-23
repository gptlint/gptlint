import type * as types from './types.js'
import { createCacheKey } from './cache.js'
import {
  assert,
  createPromiseWithResolvers,
  fileMatchesIncludeExclude
} from './utils.js'

export function createLintTask({
  rule,
  file,
  config
}: {
  rule: types.Rule
  file?: types.SourceFile
  config: types.ResolvedLinterConfig
}): types.LintTask | null {
  const { scope } = rule

  if (scope === 'file') {
    assert(file)

    if (!fileMatchesIncludeExclude(file, rule)) {
      return null
    }

    const fileRuleSettings = config.getRuleSettingsForFile(file)

    if (fileRuleSettings[rule.name] === 'off') {
      return null
    }
  }

  const lintTaskP = createPromiseWithResolvers()
  const lintTask = {
    ...lintTaskP,
    scope,
    group: scope === 'file' ? file!.fileRelativePath : scope,
    rule,
    file,
    config,
    cacheKey: createCacheKey({ file, rule, config })
  } as types.LintTask

  return lintTask
}

export function stringifyLintTask(lintTask: types.LintTask): string {
  return [
    `rule "${lintTask.rule.name}"`,
    lintTask.file ? `file "${lintTask.file.fileRelativePath}"` : undefined
  ]
    .filter(Boolean)
    .join(' ')
}
