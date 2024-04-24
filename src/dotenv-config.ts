import path from 'node:path'

import * as dotenv from 'dotenv'

/**
 * Dynamically import dotenv and configure it based on CLI arguments.
 */
const pathIndex = process.argv.indexOf('--dotenv-path') + 1
let envPath = '.env'
const configuredEnvPath = process.argv[pathIndex]

if (
  pathIndex &&
  pathIndex < process.argv.length &&
  typeof configuredEnvPath === 'string'
) {
  envPath = configuredEnvPath
}

const resolvedDotenvPath = path.resolve(process.cwd(), envPath)
dotenv.config({ path: resolvedDotenvPath })
