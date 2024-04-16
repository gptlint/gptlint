# Prefer loose array bounds checks in loops

Array bounds checks within loops should verify if a variable is `>=` or `<=` the array length instead of exactly equal to the array length. Performing strict bound checks on arrays in loops is brittle and a common cause of subtle bugs.

```js
function handleTasks() {
  const tasks = [
    // ...
  ]
  let currentTaskIndex = 0

  do {
    const currentTask = tasks[currentTaskIndex]

    // process task
    // ...

    currentTaskIndex++
  } while (currentTaskIndex !== tasks.length)
}
```

This example has two bugs:

- if `tasks` is empty, the first iteration of the while loop will throw an error
- the `while` loop guard is very brittle which is a code smell. if `currentTaskIndex` somehow gets changed in an unexpected way with future code changes, then the `while` loop guard could end up going past the end of the tasks array!

An improved version of this code which fixes these buse looks like:

```js
function handleTasks() {
  const tasks = [
    // ...
  ]
  let currentTaskIndex = 0

  while (currentTaskIndex < tasks.length) {
    const currentTask = tasks[currentTaskIndex]

    // process task
    // ...

    currentTaskIndex++
  }
}
```

## Examples

### Incorrect Examples

```js
for (let i = 0; i !== arr.length; i++) {
  // this is bad because it should use `i < arr.length` to be safer
}
```

```ts
for (let i = arr.length; i !== -1; i--) {
  // this is bad because it should use `i >= 0` or `i > -1` to be safer
}
```

```js
while (i !== tasks.length) {
  // this is bad because it should use `i < tasks.length` to be safer
  ++i
}
```

```ts
const length = arr.length
let i = 0
while (i !== length) {
  // this is bad because the while loop should use `i < length` to be safer
  ++i
}
```

### Correct Examples

```js
for (let i = 0; i < arr.length; i++) {}
```

```ts
for (let i = arr.length; i >= 0; i--) {}
```

```js
while (i < tasks.length) {
  ++i
}
```

## Metadata

| Key       | Value                                       |
| --------- | ------------------------------------------- |
| name      | `prefer-loose-array-bounds-checks-in-loops` |
| level     | `error`                                     |
| scope     | `file`                                      |
| fixable   | false                                       |
| cacheable | true                                        |
| tags      | [ `best practices` ]                        |
| exclude   | [ `**/*.test\.{js,ts,jsx,tsx,cjs,mjs}` ]    |
| gritql    | true                                        |
