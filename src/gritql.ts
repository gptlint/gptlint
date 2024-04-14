import { execa } from 'execa'
import which from 'which'

import type * as types from './types.js'
import { assert } from './utils.js'

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

        return potentialMatch
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

export function resolveGritQLMatches(
  matches: grit.Match[],
  {
    files,
    numLinesContext = 0
  }: {
    files: types.SourceFile[]
    numLinesContext?: number
  }
): types.PartialSourceFile[] {
  const matchesByFilePath = new Map<string, grit.Match[]>()
  for (const match of matches) {
    // TODO: verify if this is using absolute or relative paths
    if (!matchesByFilePath.has(match.sourceFile)) {
      matchesByFilePath.set(match.sourceFile, [])
    }
    matchesByFilePath.get(match.sourceFile)!.push(match)
  }

  const filesByFilePath = new Map(files.map((file) => [file.filePath, file]))
  const partialFilesByFilePath = new Map<string, types.PartialSourceFile>()

  for (const [filePath, file] of filesByFilePath.entries()) {
    if (!partialFilesByFilePath.has(filePath)) {
      partialFilesByFilePath.set(filePath, {
        ...file,
        ranges: [],
        partialContent: ''
      })
    }
  }

  for (const [filePath, matches] of matchesByFilePath.entries()) {
    const file = filesByFilePath.get(filePath)
    assert(file, `Could not find file for path: ${filePath}`)

    const partialFile = partialFilesByFilePath.get(filePath)!
    assert(partialFile)

    const matchRanges = matches.flatMap(
      (m) => m.variables.find((v) => v.name === '$match')?.ranges ?? m.ranges
    )

    partialFile.ranges = partialFile.ranges
      .concat(matchRanges)
      .sort((a, b) => a.start.line - b.start.line)
  }

  for (const [_, partialFile] of partialFilesByFilePath.entries()) {
    const lines = partialFile.content.split('\n')
    const { ranges } = partialFile

    let partialContentLines: string[] = []
    let maxLine = -1

    for (const range of ranges) {
      const startLine = Math.max(
        maxLine - 1,
        range.start.line - 1 - numLinesContext
      )
      const endLine = range.end.line + numLinesContext
      console.log(range.start.line, range.end.line, startLine, endLine)
      if (startLine >= endLine) continue

      maxLine = Math.max(endLine, maxLine)
      const partialLines = lines.slice(startLine, endLine)
      partialContentLines = partialContentLines.concat(partialLines)
    }

    partialFile.partialContent = partialContentLines.join('\n')
  }

  // TODO: ensure partial files are sorted the same as input files

  return [...partialFilesByFilePath.values()]
}
