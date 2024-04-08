import type * as types from './types.js'
import { createCacheKey, createPromiseWithResolvers } from './utils.js'

export function createLintTask({
  rule,
  file,
  config
}: {
  rule: types.Rule
  file?: types.SourceFile
  config: types.ResolvedLinterConfig
}): types.LintTask {
  const lintTaskP = createPromiseWithResolvers()
  const lintTask = {
    ...lintTaskP,
    scope: rule.scope,
    group: rule.scope === 'file' ? file!.fileRelativePath : rule.scope,
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
