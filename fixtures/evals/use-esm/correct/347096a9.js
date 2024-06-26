// Importing multiple named exports from a module
import { join, resolve } from 'path'

// This is correct because it uses the ESM syntax for importing named exports
const fullPath = join(resolve(), 'src', 'index.js')

export { fullPath }

// Generated by gpt-4-0125-preview
