# Use semantic variable names

| Key       | Value                   |
| --------- | ----------------------- |
| Name      | semantic-variable-names |
| Level     | error                   |
| Fixable   | false                   |
| Tags      | general                 |
| Languages | all                     |

Variable names should be descriptive and capture the semantics of the value they represent. This makes it easier to read and understand code. It also makes it clearer when variables are being misused.

An exception to this rule is that it is acceptable to use simple variable names like `i` in `for` loops.

An exception to this rule is that math-heavy code may use simple variable names within the scope of a mathematically dense function.

### Bad

```ts
// Bad because "a" is not a descriptive variable name
const a = 5

// Bad because "b" is not a descriptive variable name
const b = false
```

### Good

```ts
// Good because "numTokens" is descriptive
const numTokens = 5

// Good because "isFinished" is descriptive
const isFinished = true
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
