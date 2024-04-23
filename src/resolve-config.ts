import path from 'node:path'

import { pathExists } from 'path-exists'

import type * as types from './types.js'
import {
  defaultLinterConfig,
  parseLinterConfig,
  ResolvedLinterConfig
} from './config.js'
import { assert } from './utils.js'

export async function resolveLinterConfig(
  cliConfigOverride: types.FullyResolvedLinterConfig,
  opts: {
    cwd: string
    configFilePath?: string
    linterConfigDefaults?: types.LinterConfig
  }
): Promise<types.ResolvedLinterConfig> {
  const configsToCheck = [
    opts.configFilePath,
    'gptlint.config.js',
    'gptlint.config.mjs',
    'gptlint.config.cjs'
  ].filter(Boolean)

  const configs: types.LinterConfig[] = []
  if (opts.linterConfigDefaults) {
    configs.push(opts.linterConfigDefaults)
  }
  configs.push(defaultLinterConfig)

  for (const configFileRelativePath of configsToCheck) {
    const configFilePath = path.resolve(opts.cwd, configFileRelativePath)

    if (!(await pathExists(configFilePath))) {
      if (configFileRelativePath === opts.configFilePath) {
        throw new Error(`Error missing config file "${opts.configFilePath}"`)
      }

      continue
    }

    const configFile = await import(configFilePath)
    assert(
      configFile?.default,
      `Config file "${configFilePath}" must have a default export containing a valid config array`
    )
    const rawConfigs = configFile.default
    assert(
      Array.isArray(rawConfigs),
      `Config file "${configFilePath}" must have a default export containing a valid config array`
    )

    for (const rawConfig of rawConfigs) {
      const config = parseLinterConfig(rawConfig as Partial<types.LinterConfig>)

      configs.push(config)
    }

    // Break after we find the first project config file
    break
  }

  return new ResolvedLinterConfig({ configs, cliConfigOverride })
}
