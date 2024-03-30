import { z } from 'zod'

const ruleViolationSchema = z.object({
  ruleName: z
    .string()
    .optional()
    .describe('The name of the RULE which this `codeSnippet` violates.'),
  codeSnippet: z
    .string()
    .describe(
      'The offending code snippet which fails to conform to the given RULE. This code snippet must come verbatim from the given SOURCE.'
    ),
  codeSnippetSource: z
    .enum(['examples', 'source'])
    .optional()
    .describe(
      'Where the `codeSnippet` comes from. If it comes from the RULE examples, then use "examples". If it comes from the SOURCE, then use "source".'
    ),
  reasoning: z
    .string()
    .optional()
    .describe(
      'An explanation of why this code snippet VIOLATES the RULE. Think step-by-step when describing your reasoning.'
    ),
  violation: z
    .boolean()
    .describe(
      'Whether or not this `codeSnippet` violates the RULE. If the `codeSnippet` does VIOLATE the RULE, then `violation` should be `true`. If the `codeSnippet` conforms to the RULE correctly or does not appear in the SOURCE, then `violation` should be `false`.'
    ),
  confidence: z
    .enum(['low', 'medium', 'high'])
    .describe('Your confidence that the `codeSnippet` VIOLATES the RULE.')
})
export type RuleViolation = z.infer<typeof ruleViolationSchema>

export const ruleViolationsOutputSchema = z.array(ruleViolationSchema)
export type RuleViolationsOutput = z.infer<typeof ruleViolationsOutputSchema>
