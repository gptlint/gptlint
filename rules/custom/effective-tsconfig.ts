import { getTsconfig } from 'get-tsconfig'

import type { PartialLintError, Rule } from '../../src/index.js'

const tsConfigCache = new Map<string, any>()

const rule: Readonly<Rule> = {
  name: 'effective-tsconfig',
  message: 'Follow tsconfig best practices.',
  level: 'error',
  scope: 'project',

  preProcessProject: async (ctx) => {
    const parsedTSConfig = getTsconfig(ctx.cwd, 'tsconfig.json', tsConfigCache)

    if (!parsedTSConfig) {
      return {
        lintErrors: [
          {
            message: 'No tsconfig found.'
          }
        ]
      }
    }

    const { config: tsconfig, path: filePath } = parsedTSConfig
    const lintErrors: PartialLintError[] = []

    // TODO: caching this without the tsconfig file content is not correct
    console.error(
      '\n\n\n\nTODO: handle caching at the project / file level\n\n\n\n'
    )

    // TODO: should these checks be in processProject or processFile?
    // maybe add a new file-level task for tsconfig and disable caching on
    // this project-level task?

    if (!tsconfig.compilerOptions?.strict) {
      lintErrors.push({
        message: 'Recommended setting `strict` to `true`.',
        level: 'warn',
        filePath
      })
    }

    if (!tsconfig.compilerOptions?.forceConsistentCasingInFileNames) {
      lintErrors.push({
        message:
          'Recommended setting `forceConsistentCasingInFileNames` to `true`.',
        level: 'warn',
        filePath
      })
    }

    if (!tsconfig.compilerOptions?.noUncheckedIndexedAccess) {
      lintErrors.push({
        message: 'Recommended setting `noUncheckedIndexedAccess` to `true`.',
        level: 'warn',
        filePath
      })
    }

    // noImplicitAny

    return { lintErrors }
  }
}

export default rule
