import type * as types from './types.js'

export function stringifyRuleForModel(rule: types.Rule): string {
  return `# RULE ${rule.name}

${rule.message}

${rule.desc}

${
  rule.negativeExamples?.length
    ? '## Incorrect Examples\n\nThese are examples of bad code snippets which would VIOLATE this rule if they appear in the SOURCE.\n\n'
    : ''
}
${rule.negativeExamples?.map(
  (example) => `\`\`\`${example.language ?? ''}\n${example.code}\n\`\`\`\n\n`
)}

${
  rule.positiveExamples?.length
    ? '## Correct Examples\n\nThese are examples of good code snippets which conform to this rule and should be ignored in the SOURCE.\n\n'
    : ''
}
${rule.positiveExamples?.map(
  (example) => `\`\`\`${example.language ?? ''}\n${example.code}\n\`\`\`\n\n`
)}
`
}
