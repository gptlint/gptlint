import type * as types from './types.js'

export function createLintResult(
  partialLintResult?: Readonly<Partial<types.LintResult>>
): types.LintResult {
  return {
    lintErrors: [],
    skipped: false,
    numModelCalls: 0,
    numModelCallsCached: 0,
    numPromptTokens: 0,
    numCompletionTokens: 0,
    numTotalTokens: 0,
    totalCost: 0,
    startedAtMs: Date.now(),
    ...partialLintResult
  }
}

export function mergeLintResults(
  lintResultA: types.LintResult,
  lintResultB: types.LintResult
): types.LintResult {
  return {
    lintErrors: lintResultA.lintErrors.concat(lintResultB.lintErrors),
    skipped: lintResultA.skipped || lintResultB.skipped,
    skipReason: lintResultB.skipReason ?? lintResultA.skipReason,
    skipDetail: lintResultB.skipDetail ?? lintResultA.skipDetail,
    message: lintResultB.message ?? lintResultA.message,
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
        : lintResultB.endedAtMs ?? lintResultB.endedAtMs
  }
}

export function getLintDurationMs(
  lintResult: types.LintResult
): number | undefined {
  if (lintResult.endedAtMs === undefined) return undefined
  return Math.max(0, lintResult.endedAtMs - lintResult.startedAtMs)
}
