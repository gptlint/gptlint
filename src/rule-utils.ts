import type * as types from './types.js'
import { RuleDefinitionSchema } from './rule.js'
import { assert } from './utils.js'

export function stringifyRuleForModel(rule: types.Rule): string {
  return `<RULE ${rule.name}>

# ${rule.title}

${rule.description ?? ''}

${
  rule.negativeExamples?.length
    ? '<INCORRECT EXAMPLES>\n\nThese are examples of bad code snippets which would VIOLATE this rule if they appear in the SOURCE:\n\n'
    : ''
}
${stringifyExamples(rule.negativeExamples)}
${rule.negativeExamples?.length ? '</INCORRECT EXAMPLES>' : ''}

${
  rule.positiveExamples?.length
    ? '<CORRECT EXAMPLES>\n\nThese are examples of good code snippets which conform to this rule and should be ignored in the SOURCE:\n\n'
    : ''
}
${stringifyExamples(rule.positiveExamples)}
${rule.positiveExamples?.length ? '</CORRECT EXAMPLES>' : ''}

</RULE ${rule.name}>
`
}

export function stringifyExamples(examples?: types.RuleExample[]): string {
  return examples
    ? examples
        .map(
          (example) =>
            `\`\`\`${example.language ?? ''}\n${example.code}\n\`\`\``
        )
        .join('\n\n')
    : ''
}

export function validateRule(rule: types.Rule) {
  const parsedRule = RuleDefinitionSchema.passthrough().safeParse(rule)
  assert(parsedRule.success, `Invalid rule "${rule.name}"`)

  rule = parsedRule.data as types.Rule
  assert(isValidRuleName(rule.name), `Invalid rule name "${rule.name}"`)
  assert(
    isValidRuleScope(rule.scope),
    `Invalid rule scope "${rule.scope}" for rule "${rule.name}"`
  )
  assert(
    isValidRuleSetting(rule.level),
    `Invalid rule level "${rule.level}" for rule "${rule.name}"`
  )

  if (rule.scope !== 'file') {
    assert(
      rule.gritql === undefined,
      `Rule "${rule.name}" with scope "${rule.scope}" cannot have a "gritql" pattern because they are only supported for "file" scoped rules.`
    )
  }

  return rule
}

export function isValidRuleName(name: string): name is NonNullable<string> {
  if (!name) return false
  if (name.toLowerCase() !== name) return false

  const parts = name.split('/')
  if (parts.length === 2) {
    if (!/^@[a-z][\w-]*$/i.test(parts[0]!)) return false
    if (!/^[a-z][\w-]*$/i.test(parts[1]!)) return false
  } else if (!/^[a-z][\w-]*$/i.test(name)) return false

  return true
}

export function isValidRuleSetting(
  value: string
): value is types.LinterConfigRuleSetting {
  if (!value) return false
  if (value.toLowerCase() !== value) return false

  return value === 'off' || value === 'warn' || value === 'error'
}

export function isValidRuleScope(
  value: string
): value is types.LinterConfigRuleSetting {
  if (!value) return false
  if (value.toLowerCase() !== value) return false

  return value === 'file' || value === 'project' || value === 'repo'
}
