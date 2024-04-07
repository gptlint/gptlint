import swc from '@swc/core'

import type * as types from './types.js'

export async function parseFile({
  file
}: {
  file: types.InputFile
  config: types.ResolvedLinterConfig
}): Promise<{ file: types.InputFile; ast: swc.Module }> {
  const ast = await swc.parse(file.content, {
    syntax: file.language === 'typescript' ? 'typescript' : 'ecmascript',
    comments: true,
    target: 'esnext'
  })

  return {
    file,
    ast
  }
}
