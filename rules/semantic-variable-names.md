---
fixable: false
gritqlNumLinesContext: 2
tags: [best practices]
languages: [javascript, typescript]
exclude:
  - '**/*\.test\.{js,ts,jsx,tsx,cjs,mjs}'
---

```grit
identifier() as $id where {
  or {
    and {
      $id <: within or {
        variable_declarator($name),
        required_parameter($name),
        optional_parameter($name)
      },
      $id <: $name
    },

    or {
      and {
        $id <: within `function $func($props): $ret {$body}`,
        $id <: not or { within $body, within $func }
      },
      and {
        $id <: within `function $func($props) {$body}`,
        $id <: not or { within $body, within $func }
      },
      and {
        $id <: within `($props) => $body`,
        $id <: not within $body
      }
    }
  }
}
```

# Use semantic variable names

Variable names should be descriptive and capture the semantics of the value they represent. This makes it easier to read and understand code. It also makes it clearer when variables are being misused.

## Caveats

An exception to this rule is that it is acceptable to use simple variable names like `i` in `for` loops.

An exception to this rule is that math-heavy code may use simple variable names within the scope of a mathematically dense function.

Common acronyms like `api`, `ast`, and `llm` are fine even though they aren't as descriptive.

`res`, `result`, and `data` are common exceptions that are okay to ignore.

Variables names which mirror the corresponding type name are okay to ignore.

Keys in objects and JS/TS strings are not variable names, so they should be ignored.

If a value isn't a variable name, then it should be ignored.

This rule should be ignored in test files.

The names of file imports from third-party APIs and modules should be ignored because we have no control over them.

If you are unsure whether or not a variable name is descriptive enough, err on the side of caution by setting `confidence` to `low`.

### Bad

```ts
// Bad because "a" is not a descriptive variable name
const a = 5

// Bad because "b" is not a descriptive variable name
const b = false
```

```js
// Bad because "obj" is not a descriptive variable name
const obj = { id: 5, name: 'Bob' }
```

### Good

```ts
// Good because "numTokens" is descriptive
const numTokens = 5

// Good because "isFinished" is descriptive
const isFinished = true

// Good because "ast" is an acronym
const ast = parseAST()

// Good because "fileTypeToParserMap" is very descriptive
const fileTypeToParserMap: Record<string, string> = {}
```

```ts
// "i" is okay here because it is a simple for loop
for (let i = 0; i < 10; i++) {}
```

```ts
// "x", "y", and "r" are all okay here because they represent real, mathematical
// concepts, and concise variable names are often preferred in math-heavy code.
function normalDist(mu = 0, sigma = 1) {
  let x: number, y: number, r: number

  do {
    x = Math.random() * 2 - 1
    y = Math.random() * 2 - 1
    r = x * x + y * y
  } while (!r || r > 1)

  return mu + sigma * y * Math.sqrt((-2 * Math.log(r)) / r)
}
```

```ts
// These are fine because the simple variable names match the corresponding type names.
const rule: Rule = {}
const data: Data = {}
```

```ts
// This is fine because `z` is an external dependency that we have no control over.
import { z } from 'zod'
```
