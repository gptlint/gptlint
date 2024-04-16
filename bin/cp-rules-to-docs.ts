#!/usr/bin/env node
import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import { gracefulExit } from 'exit-hook'
import { globby } from 'globby'
import pMap from 'p-map'

import type * as types from '../src/types.js'
import { formatSource } from '../src/formatter.js'
import { parseRuleFilePath } from '../src/parse-rule-file.js'
import { stringifyExamples } from '../src/rule-utils.js'

/**
 * Internal script for copying built-in rules to docs.
 *
 * TODO: sort rules and metadata using stable sort.
 */
async function main() {
  const destDir = path.join('docs', 'pages', 'rules')
  const files = await globby('.gptlint/*.md')
  const metadata: Record<string, any> = {
    index: 'Overview'
  }
  const rules: types.Rule[] = []

  await pMap(
    files,
    async (file) => {
      const srcPath = path.resolve(file)
      const fileName = file.split('/').pop()!
      const destPath = path.join(destDir, fileName)
      const rule = await parseRuleFilePath(srcPath)

      rules.push(rule)
      metadata[rule.name] = {
        title: rule.name,
        display: 'hidden'
      }

      const metadataKeys = [
        'name',
        'level',
        'scope',
        'fixable',
        'cacheable',
        'tags',
        'eslint',
        'include',
        'exclude',
        'model',
        'resources',
        'gritqlNumLinesContext'
      ]

      const ruleMetadata = metadataKeys
        .map((key) =>
          (rule as any)[key] !== undefined ? [key, (rule as any)[key]] : null
        )
        .filter(Boolean)

      if (rule.gritql) {
        ruleMetadata.push(['gritql', true])
      }

      const ruleMetadataTable = `| Key | Value |\n| --- | --- |\n${ruleMetadata.map(([k, v]) => `| ${k} | \`${JSON.stringify(v).replace(/^"/, '').replace(/"$/, '')}\` |`).join('\n')}`

      const ruleSource = [
        `# ${rule.title}`,
        rule.description,
        rule.negativeExamples?.length || rule.positiveExamples?.length
          ? '## Examples'
          : '',
        rule.negativeExamples?.length &&
          `### Incorrect Examples\n\n${stringifyExamples(rule.negativeExamples)}`,
        rule.positiveExamples?.length &&
          `### Correct Examples\n\n${stringifyExamples(rule.positiveExamples)}`,
        '## Metadata',
        ruleMetadataTable
      ]
        .filter(Boolean)
        .join('\n\n')

      const formattedRuleSource = await formatSource(ruleSource, {
        fileType: 'md'
      })

      await fs.writeFile(destPath, formattedRuleSource)
    },
    {
      concurrency: 32
    }
  )

  const metadataSource = await formatSource(
    `export default ${JSON.stringify(metadata, null, 2)}`,
    { fileType: 'ts' }
  )

  await fs.writeFile(path.join(destDir, '_meta.ts'), metadataSource)

  const overviewSource = await formatSource(
    `
# Built-in Rules

| Rule | Title | Scope |
| ---- | ----- | ----- |
${rules.map((rule) => `| [${rule.name}](/rules/${rule.name}) | ${rule.title} | ${rule.scope} |`).join('\n')}
`.trim(),
    { fileType: 'md' }
  )

  await fs.writeFile(path.join(destDir, 'index.md'), overviewSource)
}

try {
  await main()
} catch (err) {
  console.error(err)
  gracefulExit(1)
}
