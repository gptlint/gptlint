import { cli } from 'cleye'
import fs from 'fs/promises'

import { parseGuidelines } from '../src/parse-guidelines.js'

async function main() {
  const args = cli(
    {
      name: 'lint',
      parameters: [],
      flags: {
        guidelines: {
          type: String,
          description: 'Path to the rules markdown file',
          alias: 'r',
          default: 'guidelines.md'
        }
      }
    },
    () => {},
    process.argv
  )

  const rulesFile = await fs.readFile(args.flags.guidelines, 'utf-8')

  try {
    const guidelines = await parseGuidelines(rulesFile)

    console.log(JSON.stringify(guidelines, null, 2))
  } catch (err: any) {
    console.error(
      `Error parsing guidelines file "${args.flags.guidelines}"`,
      err.message
    )
    console.log()
    args.showHelp()
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
