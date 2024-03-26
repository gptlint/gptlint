# Project Guidelines <!-- omit from toc -->

- [General](#general)
  - [Be consistent with identifier casing](#be-consistent-with-identifier-casing)
  - [Use semantic variable names](#use-semantic-variable-names)
  - [Format comments like sentences](#format-comments-like-sentences)
  - [Prefer using Array.at when indexing from the end of an array](#prefer-using-arrayat-when-indexing-from-the-end-of-an-array)
  - [Use ESM modules instead of CommonJS](#use-esm-modules-instead-of-commonjs)
- [React](#react)
  - [Don't use React class components](#dont-use-react-class-components)

# General

## Be consistent with identifier casing

| Key       | Value                        |
| --------- | ---------------------------- |
| Name      | consistent-identifier-casing |
| Level     | error                        |
| Fixable   | false                        |
| Tags      | general                      |
| Languages | all                          |

Identifiers of the same type should use consistent casing. This rule applies to all types of identifiers: variable names, class names, type names, function names, constants, etc.

For example, if some variable names use camelCase, then all variable names should use camelCase. If some type names use PascalCase, then all type names should use PascalCase. If some constants use CONSTANT_CASE, then all constants should use constant case.

### Bad

```ts (bad)
// This is bad because variable identifiers should use consistent casing.
const fooBar = true
const default_timeout = 5000

// This is bad because function identifiers should use consistent casing.
function helloWorld() {}
function hello_twitter() {}
```

### Good

```ts (good)
const fooBar = true
const defaultTimeout = 5000

function helloWorld() {}
function helloTwitter() {}
```

## Use semantic variable names

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

## Format comments like sentences

| Key       | Value                          |
| --------- | ------------------------------ |
| Name      | format-comments-like-sentences |
| Level     | error                          |
| Fixable   | true                           |
| Tags      | general                        |
| Languages | all                            |

Capitalize the first word unless it's a case-sensitive identifier. End it with a period (or "!" or "?", I suppose). This is true for all comments: doc comments, inline stuff, even TODOs. Even if it's a sentence fragment.

```ts (bad)
// quick comment
```

```ts (good)
// Quick comment.
```

## Prefer using Array.at when indexing from the end of an array

| Key       | Value                             |
| --------- | --------------------------------- |
| Name      | prefer-array-at-negative-indexing |
| Level     | error                             |
| Fixable   | true                              |
| Tags      | general                           |
| Languages | javascript, typescript            |

When accessing items in an array from the end, like the last item, prefer using `Array.at` with a negative index because it is less error-prone. Note that using `Array.at` with a positive index is equivalent to indexing into the array normally, and if `Array.at` references a non-existing index, it will return `undefined`.

```ts (bad)
const items = [1, 2, 3, 4, 5, 6, 7]
const lastItem = items[items.length - 1]
```

```ts (good)
const items = [1, 2, 3, 4, 5, 6, 7]
const lastItem = items.at(-1)
```

## Use ESM modules instead of CommonJS

| Key       | Value                  |
| --------- | ---------------------- |
| Name      | use-esm-modules        |
| Level     | error                  |
| Fixable   | false                  |
| Tags      | general                |
| Languages | javascript, typescript |

TODO

# React

## Don't use React class components

| Key       | Value                        |
| --------- | ---------------------------- |
| Name      | avoid-react-class-components |
| Level     | error                        |
| Fixable   | false                        |
| Tags      | react                        |
| Languages | javascript, typescript       |

React class components are deprecated. Use React functions and hooks instead.

```tsx (bad)
class Label extends Component {
  render() {
    return <div>Hello</div>
  }
}
```

```tsx (good)
function Button() {
  return <div>Hello</div>
}
```
