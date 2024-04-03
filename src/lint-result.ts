import type * as types from './types.js'

export function createLintResult(): types.LintResult {
  return {
    lintErrors: [],
    numModelCalls: 0,
    numModelCallsCached: 0,
    numPromptTokens: 0,
    numCompletionTokens: 0,
    numTotalTokens: 0,
    totalCost: 0,
    startedAtMs: Date.now()
  }
}

export function mergeLintResults(
  lintResultA: types.LintResult,
  lintResultB: types.LintResult
): types.LintResult {
  return {
    lintErrors: lintResultA.lintErrors.concat(lintResultB.lintErrors),
    numModelCalls: lintResultA.numModelCalls + lintResultB.numModelCalls,
    numModelCallsCached:
      lintResultA.numModelCallsCached + lintResultB.numModelCallsCached,
    numPromptTokens: lintResultA.numPromptTokens + lintResultB.numPromptTokens,
    numCompletionTokens:
      lintResultA.numCompletionTokens + lintResultB.numCompletionTokens,
    numTotalTokens: lintResultA.numTotalTokens + lintResultB.numTotalTokens,
    totalCost: lintResultA.totalCost + lintResultB.totalCost,
    startedAtMs: Math.min(lintResultA.startedAtMs, lintResultB.startedAtMs),
    endedAtMs:
      lintResultA.endedAtMs !== undefined && lintResultB.endedAtMs !== undefined
        ? Math.max(lintResultA.endedAtMs, lintResultB.endedAtMs)
        : undefined
  }
}

export function getLintDurationMs(
  lintResult: types.LintResult
): number | undefined {
  if (lintResult.endedAtMs === undefined) return undefined
  return Math.max(0, lintResult.endedAtMs - lintResult.startedAtMs)
}
