# Be consistent with identifier casing

Identifiers of the same type should try to use consistent casing.

Variable names should use camelCase.
Global const variable names should either use camelCase, PascalCase, or CONSTANT_CASE.
Type names should use PascalCase.
Class names should use PascalCase.
Function names should use camelCase.

Examples of camelCase identifiers include: foo, fooBar, h1RuleNodes, cwd, apiBaseUrl, apiBaseURL, validRuleTableKeysL, and \_getKey.

## Caveats

Third-party APIs may use inconsistent casing, which is an exception to this rule.

Keys in JSON objects, JS objects, and TypeScript objects may use inconsistent casing, so they are exceptions to this rule.

Ignore identifiers which mix PascalCase with camelCase.

Ignore the casing of common acronyms like API, IP, HTTP, and LLM.

Ignore the casing of identifiers which start with acronyms like `LLMOptionsSchema`.

Ignore parameter names used in inline functions.

Ignore string literals and module names for this rule.

Class member variables and functions may include `_` prefixes.

## Examples

### Incorrect Examples

```ts
// These are bad because variable identifiers should use consistent casing.
const fooBar = true
const default_timeout = 5000

// These are bad because function identifiers should use consistent casing.
function helloWorld() {}
function hello_twitter() {}
```

### Correct Examples

```ts
const fooBar = true
const defaultTimeout = 5000

function helloWorld() {}
function helloTwitter() {}
```

```ts
import foo from 'foo'

// This is fine because `foo` is a third-party API which this rule should ignore.
foo({ camelCase: true, snake_case: true, SNAKE_CASE: true })
```

```ts
// These are all fine as common exceptions to this rule
export const HTTPConfig = {}
const LLMOptions = {}
const validKeysL = new Set()
const loadingP = new Promise()
const cwd = process.cwd
```

```ts
// This is fine because `i` is a parameter of an inline function and `res` is a common exception.
const res = [1, 2, 3].filter((i) => i >= 0)
```

## Metadata

| Key       | Value                                                   |
| --------- | ------------------------------------------------------- |
| name      | `consistent-identifier-casing`                          |
| level     | `error`                                                 |
| scope     | `file`                                                  |
| fixable   | false                                                   |
| cacheable | true                                                    |
| tags      | [ `best practices` ]                                    |
| eslint    | [ `@typescript-eslint/naming-convention`, `camelcase` ] |
| gritql    | true                                                    |
