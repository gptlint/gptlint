import path from 'node:path'

import { pathExists } from 'path-exists'

import type * as types from './types.js'
import {
  defaultLinterConfig,
  mergeLinterConfigs,
  parseLinterConfig
} from './config.js'
import { assert } from './utils.js'

export async function resolveLinterConfig(
  linterConfig: types.LinterConfig,
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
      `Config file "${configFilePath}" must export a valid config array`
    )
    const rawConfigs = configFile.default
    assert(
      Array.isArray(rawConfigs),
      `Config file "${configFilePath}" must export a valid config array`
    )

    // TODO: each of these sub-configs should only be enabled if `files` + `ignores` match, so it's not a strict merge
    for (const rawConfig of rawConfigs) {
      const config = parseLinterConfig(rawConfig)

      linterConfig = mergeLinterConfigs(config, linterConfig)
    }

    // Break after we find the first project config file
    break
  }

  if (opts.linterConfigDefaults) {
    linterConfig = mergeLinterConfigs(opts.linterConfigDefaults, linterConfig)
  }

  linterConfig = mergeLinterConfigs(defaultLinterConfig, linterConfig)
  return linterConfig as types.ResolvedLinterConfig
}
