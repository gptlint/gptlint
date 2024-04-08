import multimatch from 'multimatch'

import type * as types from './types.js'
import { assert, createCacheKey, createPromiseWithResolvers } from './utils.js'

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

    if (rule.include) {
      const matches = multimatch(file.fileRelativePath, rule.include)
      if (!matches.length) {
        return null
      }
    }

    if (rule.exclude) {
      const matches = multimatch(file.fileRelativePath, rule.exclude)
      if (matches.length) {
        return null
      }
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
