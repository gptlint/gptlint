import { expect, test } from 'vitest'

import {
  isRuleViolationLikelyFalsePositive,
  parseRuleViolationsFromJSONModelResponse
} from './rule-violations.js'

test('parseRuleViolationsFromJSONModelResponse - valid', () => {
  expect(
    parseRuleViolationsFromJSONModelResponse(`{ ruleViolations: [ ] }`)
  ).toMatchSnapshot()

  expect(
    parseRuleViolationsFromJSONModelResponse(`{
  ruleViolations: [
    {
      ruleName: "test",
      codeSnippet: "const foo = 'bar'",
      codeSnippetSource: "source",
      reasoning: "lorem ipsum",
      violation: true,
      confidence: "high"
    }
  ]
}`)
  ).toMatchSnapshot()
})

test('parseRuleViolationsFromJSONModelResponse - invalid', () => {
  expect(() =>
    parseRuleViolationsFromJSONModelResponse(`{
  ruleViolations: [
    {
      ruleName: "test",
      codeSnippetSource: "source",
      reasoning: "lorem ipsum",
      violation: true,
      confidence: "high"
    }
  ]
}`)
  ).toThrow()

  expect(() =>
    parseRuleViolationsFromJSONModelResponse(`{
  ruleViolations: [
    {
      ruleName: "test",
      codeSnippetSource: "source",
      reasoning: "lorem ipsum",
      violation: "false",
      confidence: "high"
    }
  ]
}`)
  ).toThrow()

  expect(() =>
    parseRuleViolationsFromJSONModelResponse(`{
  ruleViolations: [
    {
      ruleName: "test",
      codeSnippet: "const foo = 'bar'",
      codeSnippetSource: "source",
      reasoning: "lorem ipsum",
      violation: true,
      confidence: 0.5
    }
  ]
}`)
  ).toThrow()

  expect(() =>
    parseRuleViolationsFromJSONModelResponse(`[
  {
    ruleName: "test",
    codeSnippet: "const foo = 'bar'",
    codeSnippetSource: "source",
    reasoning: "lorem ipsum",
    violation: true,
    confidence: "high"
  }
]`)
  ).toThrow()
})

test('isRuleViolationLikelyFalsePositive - true positives', () => {
  expect(
    isRuleViolationLikelyFalsePositive({
      ruleViolation: {
        ruleName: 'test',
        codeSnippet: "const foo = 'bar'",
        codeSnippetSource: 'source',
        reasoning: 'lorem ipsum',
        violation: true,
        confidence: 'high'
      },
      file: {
        fileRelativePath: 'src/index.ts',
        content: "const foo = 'bar'"
      },
      rule: {
        name: 'test'
      }
    })
  ).toBe(false)

  expect(
    isRuleViolationLikelyFalsePositive({
      ruleViolation: {
        ruleName: 'test',
        codeSnippet: "const foo = 'bar'",
        codeSnippetSource: 'source',
        reasoning: 'lorem ipsum',
        violation: true,
        confidence: 'medium'
      },
      file: {
        fileRelativePath: 'src/index.ts',
        content: "const foo = 'bar'"
      },
      rule: {
        name: 'test',
        negativeExamples: [
          {
            code: "const foo = 'bar'"
          }
        ]
      }
    })
  ).toBe(false)
})

test('isRuleViolationLikelyFalsePositive - false positives', () => {
  expect(
    isRuleViolationLikelyFalsePositive({
      ruleViolation: {
        ruleName: 'test',
        codeSnippet: "const foo = 'bar'",
        codeSnippetSource: 'source',
        reasoning: 'lorem ipsum',
        violation: false,
        confidence: 'high'
      },
      file: {
        fileRelativePath: 'src/index.ts',
        content: "const foo = 'bar'"
      },
      rule: {
        name: 'test'
      }
    })
  ).toBe(true)

  expect(
    isRuleViolationLikelyFalsePositive({
      ruleViolation: {
        ruleName: 'test',
        codeSnippet: "const foo = 'bar'",
        codeSnippetSource: 'source',
        reasoning: 'lorem ipsum',
        violation: true,
        confidence: 'low'
      },
      file: {
        fileRelativePath: 'src/index.ts',
        content: "const foo = 'bar'"
      },
      rule: {
        name: 'test'
      }
    })
  ).toBe(true)

  expect(
    isRuleViolationLikelyFalsePositive({
      ruleViolation: {
        ruleName: 'test',
        codeSnippet: "const foo = 'bar'",
        codeSnippetSource: 'unknown',
        reasoning: 'lorem ipsum',
        violation: true,
        confidence: 'low'
      },
      file: {
        fileRelativePath: 'src/index.ts',
        content: "const foo = 'bar'"
      },
      rule: {
        name: 'test'
      }
    })
  ).toBe(true)

  expect(
    isRuleViolationLikelyFalsePositive({
      ruleViolation: {
        ruleName: 'test',
        codeSnippet: "const foo = 'bar'",
        codeSnippetSource: 'source',
        reasoning: 'lorem ipsum',
        violation: true,
        confidence: 'medium'
      },
      file: {
        fileRelativePath: 'src/index.ts',
        content: 'lorem ipsum... '
      },
      rule: {
        name: 'test',
        negativeExamples: [
          {
            code: "const foo = 'bar'"
          }
        ]
      }
    })
  ).toBe(true)
})
