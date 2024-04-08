import { getTsconfig } from 'get-tsconfig'

import {
  createCacheKey,
  type PartialLintError,
  type Rule
} from '../../src/index.js'

const tsConfigCache = new Map<string, any>()

const rule: Readonly<Rule> = {
  name: 'effective-tsconfig',
  message: 'Follow tsconfig best practices.',
  level: 'error',
  scope: 'project',
  resources: ['https://typescriptlang.org/tsconfig'],

  preProcessProject: async ({ rule, cache, config, cwd }) => {
    const parsedTSConfig = getTsconfig(cwd, 'tsconfig.json', tsConfigCache)

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

    // TODO: how to pass cacheKey along? need `lintTask` instead of just spread `lintTask`?
    const cacheKey = createCacheKey({ rule, config, filePath, tsconfig })
    const cachedResult = await cache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    // TODO: should these checks be in processProject or processFile?
    // maybe add a new file-level task for tsconfig and disable caching on
    // this project-level task?

    if (!tsconfig.compilerOptions?.strict) {
      lintErrors.push({
        message: 'Recommended setting "strict" to `true`.',
        level: 'warn',
        filePath
      })
    }

    if (!tsconfig.compilerOptions?.forceConsistentCasingInFileNames) {
      lintErrors.push({
        message:
          'Recommended setting "forceConsistentCasingInFileNames" to `true`.',
        level: 'warn',
        filePath
      })
    }

    if (!tsconfig.compilerOptions?.noUncheckedIndexedAccess) {
      lintErrors.push({
        message: 'Recommended setting "noUncheckedIndexedAccess" to `true`.',
        level: 'warn',
        filePath
      })
    }

    await cache.set(cacheKey, { lintErrors } as any)
    return { lintErrors }
  }
}

export default rule
