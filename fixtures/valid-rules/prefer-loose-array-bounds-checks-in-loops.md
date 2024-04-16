---
fixable: false
tags: [best practices]
languages: [javascript, typescript]
exclude:
  - '**/*.test\.{js,ts,jsx,tsx,cjs,mjs}'
---

```grit
or {
  do_statement(),
  while_statement(),
  for_statement()
}
```

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
