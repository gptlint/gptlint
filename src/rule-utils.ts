import type * as types from './types.js'

export function stringifyRuleForModel(rule: types.Rule): string {
  return `<RULE ${rule.name}>

# ${rule.title}

${rule.description ?? ''}

${
  rule.negativeExamples?.length
    ? '<INCORRECT EXAMPLES>\n\nThese are examples of bad code snippets which would VIOLATE this rule if they appear in the SOURCE.\n\n'
    : ''
}
${
  rule.negativeExamples
    ? rule.negativeExamples
        .map(
          (example) =>
            `\`\`\`${example.language ?? ''}\n${example.code}\n\`\`\``
        )
        .join('\n\n')
    : ''
}
${rule.negativeExamples?.length ? '</INCORRECT EXAMPLES>' : ''}

${
  rule.positiveExamples?.length
    ? '<CORRECT EXAMPLES>\n\nThese are examples of good code snippets which conform to this rule and should be ignored in the SOURCE.\n\n'
    : ''
}
${
  rule.positiveExamples
    ? rule.positiveExamples
        .map(
          (example) =>
            `\`\`\`${example.language ?? ''}\n${example.code}\n\`\`\``
        )
        .join('\n\n')
    : ''
}
${rule.positiveExamples?.length ? '</CORRECT EXAMPLES>' : ''}

</RULE ${rule.name}>
`
}
