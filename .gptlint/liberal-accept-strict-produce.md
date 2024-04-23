---
fixable: false
gritqlNumLinesContext: 3
tags: [best practices]
languages: [typescript]
exclude:
  - '**/*\.test\.{js,ts,jsx,tsx,cjs,mjs}'
resources:
  - https://effectivetypescript.com
---

```grit
function_declaration
```

# Postel's Law: Be Liberal in What You Accept, Strict in What You Produce

Postel's Law, also known as the Robustness Principle, is a design guideline that promotes interoperability, flexibility, and reliability. It states:

1. **Be liberal in what you accept**: When receiving input or interacting with other systems, be tolerant and accept a wide range of possible inputs. Handle minor variations, deviations, or even slightly malformed input gracefully, without rejecting it outright.

2. **Be strict in what you produce**: When sending output or data to other systems, adhere to the specified format or protocol strictly. Generate well-formed, valid output that conforms to the expected standards or specifications.

The intent behind Postel's Law is to build robust and resilient systems that can handle imperfect or unexpected input from other components while ensuring that the output they generate is precise and reliable. By accepting a broader range of inputs, a system can be more compatible and interoperable with other systems. By producing strict and well-defined output, a system can provide predictable and consistent data to its consumers.

When applied to code, Postel's Law suggests that functions, methods, or interfaces should:

- Accept a wide range of valid inputs, including edge cases or minor variations.
- Be tolerant of input that may not perfectly match the expected format or type.
- Produce output that strictly adheres to the specified format, type, or contract.
- Generate predictable and well-formed output, even in the face of unexpected or erroneous input.

Violating Postel's Law can lead to brittle, inflexible code that breaks easily when interacting with other systems or when receiving input that doesn't exactly match expectations. It can also lead to producing output that is inconsistent, malformed, or ambiguous, making it difficult for other parts of the system to consume or rely on.

### Bad

```ts
// Throws an error if the array is empty, doesn't handle strings or other types
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) {
    throw new Error('Empty array provided')
  }
  const sum = numbers.reduce((acc, num) => acc + num, 0)
  return sum / numbers.length
}

// Only accepts a Date object, doesn't handle string or number input
function formatDate(date: Date): string {
  return date.toISOString()
}

// Expects a user object with a required name property, doesn't handle null or missing name
function getUserName(user: { name: string }): string {
  return user.name
}
```

### Good

```ts
// Accepts numbers or strings, filters out valid numbers, handles empty array gracefully
function calculateAverage(numbers: (number | string)[]): number {
  const validNumbers = numbers.filter((num) => typeof num === 'number')
  if (validNumbers.length === 0) {
    return 0
  }
  const sum = validNumbers.reduce((acc, num) => acc + Number(num), 0)
  return sum / validNumbers.length
}

// Accepts Date, string, or number input, attempts to parse the input, returns 'Invalid Date' for invalid input
function formatDate(date: Date | string | number): string {
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) {
    return 'Invalid Date'
  }
  return parsedDate.toISOString()
}

// Accepts a user object with an optional name property or null, returns 'Anonymous' as a default value
function getUserName(user: { name?: string } | null): string {
  if (user && user.name) {
    return user.name
  }
  return 'Anonymous'
}
```
