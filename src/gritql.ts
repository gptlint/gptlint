import { execa } from 'execa'
import plur from 'plur'
import which from 'which'

import type * as types from './types.js'
import * as constants from './constants.js'
import { createLintResult } from './lint-result.js'
import { assert } from './utils.js'

/**
 * @see https://github.com/getgrit/gritql
 */
export namespace grit {
  export interface Match {
    __typename: Typename
    messages: any[]
    variables: Variable[]
    sourceFile: string
    ranges: Range[]
    level?: number
    message?: string
    debug?: string
  }

  export type Typename = 'Match' | 'AnalysisLog' | 'AllDone'

  export interface Range {
    start: FileOffset
    end: FileOffset
    startByte: number
    endByte: number
  }

  export interface FileOffset {
    line: number
    column: number
  }

  export interface Variable {
    name: VariableName
    scopedName: ScopedName
    ranges: Range[]
  }

  export type VariableName =
    | '$absolute_filename'
    | '$all_imports'
    | '$anchor'
    | '$body'
    | '$filename'
    | '$GLOBAL_IMPORTED_NAMES'
    | '$GLOBAL_IMPORTED_SOURCES'
    | '$h'
    | '$imported_names'
    | '$imports'
    | '$joined_imported_names'
    | '$match'
    | '$name'
    | '$new_files'
    | '$p'
    | '$program'
    | '$source'
    | '$statements'
    | string

  export type ScopedName = string
}

/**
 * Resolves a GritQL pattern against the given source files and then resolves
 * the matches to construct partial source files containing only the matched
 * portions.
 */
export async function resolveGritQLPattern(
  pattern: string,
  {
    files,
    numLinesContext = constants.gritNumLinesContext
  }: {
    files: types.SourceFile[]
    // Number of lines of context to include around each matching range
    numLinesContext?: number
  }
): Promise<Map<string, types.PartialSourceFile>> {
  if (!(await hasGrit())) {
    return new Map()
  }

  const matches = await applyGritQLPattern(pattern, { files })
  return resolveGritQLMatches(matches, { files, numLinesContext })
}

/**
 * Runs `grit apply --dry-run --jsonl` on the given `pattern` and `files`.
 *
 * Returns an array of matches.
 */
export async function applyGritQLPattern(
  pattern: string,
  {
    files
  }: {
    files: types.SourceFile[]
  }
): Promise<grit.Match[]> {
  const gritBinary = await whichGritBinary()
  if (!gritBinary) {
    throw new Error(`Could not find 'grit' binary in $PATH`)
  }

  const paths = files.map((file) => file.filePath)

  const res = await execa(gritBinary, [
    'apply',
    '--dry-run',
    '--jsonl',
    pattern,
    ...paths
  ])

  // Parse the jsonl output for matches
  const lines = res.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const gritMatches = lines
    .map((line) => {
      try {
        const potentialMatch = JSON.parse(line) as grit.Match
        if (potentialMatch?.__typename !== 'Match') {
          return undefined
        }

        const { debug: _, ...match } = potentialMatch
        return match
      } catch {
        return undefined
      }
    })
    .filter(Boolean)

  return gritMatches
}

export async function hasGrit(): Promise<boolean> {
  const gritBinary = await whichGritBinary()
  return !!gritBinary
}

export async function whichGritBinary(): Promise<string | null> {
  // TODO: make sure this matches `node_modules/.bin/grit`
  return which('grit', { nothrow: true })
}

/**
 * Takes an array of GritQL `matches` and the `files` they're matched against,
 * and returns an array of partial source files containing only the matched
 * portions of the given files.
 */
export function resolveGritQLMatches(
  matches: grit.Match[],
  {
    files,
    numLinesContext = constants.gritNumLinesContext
  }: {
    files: types.SourceFile[]
    // Number of lines of context to include around each matching range
    numLinesContext?: number
  }
): Map<string, types.PartialSourceFile> {
  const matchesByFilePath = new Map<string, grit.Match[]>()

  // Group matches by absolute file path
  for (const match of matches) {
    // TODO: verify if this is using absolute or relative paths
    if (!matchesByFilePath.has(match.sourceFile)) {
      matchesByFilePath.set(match.sourceFile, [])
    }
    matchesByFilePath.get(match.sourceFile)!.push(match)
  }

  const partialFilesByFilePath = new Map<string, types.PartialSourceFile>()

  // Group partial files by absolute file path
  for (const file of files) {
    const { filePath } = file

    if (!partialFilesByFilePath.has(filePath)) {
      partialFilesByFilePath.set(filePath, {
        ...file,
        ranges: [],
        partialContent: ''
      })
    }
  }

  // Concat all the ranges for each file
  for (const [filePath, matches] of matchesByFilePath.entries()) {
    const partialFile = partialFilesByFilePath.get(filePath)!
    assert(partialFile)

    const matchRanges = matches.flatMap(
      (m) => m.variables.find((v) => v.name === '$match')?.ranges ?? m.ranges
    )

    partialFile.ranges = partialFile.ranges
      .concat(matchRanges)
      .sort((a, b) => a.start.line - b.start.line)
  }

  // Aggregate the partial content for each file based on the matched ranges
  for (const partialFile of partialFilesByFilePath.values()) {
    const lines = partialFile.content.split('\n')
    const { ranges } = partialFile

    let partialContentLines: string[] = []
    let maxLine = -1

    for (const range of ranges) {
      const startLine = Math.max(
        Math.max(0, maxLine - 1),
        range.start.line - 1 - numLinesContext
      )
      const endLine = range.end.line + numLinesContext
      if (startLine >= endLine) continue

      maxLine = Math.max(endLine, maxLine)
      const partialLines = lines.slice(startLine, endLine)
      partialContentLines = partialContentLines.concat(partialLines)
    }

    partialFile.partialContent = partialContentLines
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
  }

  return partialFilesByFilePath
}

export async function preProcessFileWithGrit({
  file,
  files,
  rule,
  config,
  ruleNameToPartialSourceFileMap = new Map()
}: {
  file: types.SourceFile | types.PartialSourceFile
  rule: types.Rule
  config: types.ResolvedLinterConfig
  files?: (types.SourceFile | types.PartialSourceFile)[]
  ruleNameToPartialSourceFileMap?: Map<
    string,
    Promise<Map<string, types.PartialSourceFile>>
  >
}): Promise<types.LintResult | undefined> {
  if (!rule.gritql || config.linterOptions.noGrit) {
    return
  }

  if (!ruleNameToPartialSourceFileMap.has(rule.name)) {
    const partialSourceFileMapP = resolveGritQLPattern(rule.gritql, {
      files: files ?? [file],
      numLinesContext: rule.gritqlNumLinesContext
    })
    ruleNameToPartialSourceFileMap.set(rule.name, partialSourceFileMapP)

    const partialSourceFileMap = await partialSourceFileMapP
    if (config.linterOptions.debugGrit) {
      console.log(
        `gritql pattern "${rule.gritql}" matches:\n\n${[
          ...partialSourceFileMap.values()
        ]
          .map(
            (f) =>
              `  ${f.fileRelativePath} found ${f.ranges?.length || 0} ${plur('match', f.ranges?.length || 0)}`
          )
          .join('\n\n')}\n\n`
      )
    }
  }

  const partialSourceFileMap = await ruleNameToPartialSourceFileMap.get(
    rule.name
  )!

  const partialSourceFile = partialSourceFileMap.get(file.filePath)!
  assert(partialSourceFile)

  file.ranges = partialSourceFile.ranges
  file.partialContent = partialSourceFile.partialContent.trim()

  if (!file.ranges.length || !file.partialContent) {
    return createLintResult({
      skipped: true,
      skipReason: 'grit-pattern',
      skipDetail: 'no gritql matches'
    })
  }
}
