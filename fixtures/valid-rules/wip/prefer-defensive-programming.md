---
title: Prefer defensive programming techniques
fixable: false
tags: [best practices]
languages: [javascript, typescript]
exclude:
  - '**/*.test\.{js,ts,jsx,tsx,cjs,mjs}'
---

# Prefer defensive programming techniques <!-- omit from toc -->

Defensive programming is a mindset and series of techniques aimed at improving software quality and reliability by writing code that expects the unexpected and gracefully handles these unexpected inputs at runtime. Defensive programming is proactive in failing fast, handling errors, validating inputs, and maintaining consistent state under unexpected conditions, ensuring that the program behaves correctly even in unforeseen scenarios.

The following defensive programming techniques should be preferred whenever possible:

- [Validate external data with type guards or schema validation](#validate-external-data-with-type-guards-or-schema-validation)
- [Use optional chaining and nullish coalescing where appropriate](#use-optional-chaining-and-nullish-coalescing-where-appropriate)
- [Prefer loose array bounds checks over more brittle exact checks](#prefer-loose-array-bounds-checks-over-more-brittle-exact-checks)
- [Prefer readonly and Partial utility types](#prefer-readonly-and-partial-utility-types)
- [Ensure exhaustiveness in switch statements](#ensure-exhaustiveness-in-switch-statements)
- [Use defensive error handling](#use-defensive-error-handling)

## Validate external data with type guards or schema validation

When dealing with data from external sources (like public APIs), don't just trust that the payload matches your internal types. If you're dealing with external data which you can't trust, then prefer using a validation library like `zod` with type guards to validate the shape and type of the external data at runtime.

```ts
import { z } from 'zod'

const UserProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().optional()
})

// Example of an external data source (e.g., API response)
const externalData = {
  id: 1,
  name: 'Jane Doe',
  email: 'jane.doe@example.com'
}

try {
  // Validate the external data against the schema
  const userProfile = UserProfileSchema.parse(externalData)
  console.log('Validated User Profile:', userProfile)
} catch (error) {
  console.error('Validation Failed:', error.errors)
}
```

NOTE: **You do not always need to validate function arguments**. This suggestion is only meant for when you are sure you're dealing with **external data that your program does not trust**. For normal function arguments, you can safely ignore this rule.

## Use optional chaining and nullish coalescing where appropriate

Code written with a defensive mindset will often contain a lot of optional chaining (`?.`) and nullish coalescing (`??`).

```ts
function getFirstName(user?: User, defaultName = 'john'): string {
  return user?.name?.split(' ')[0] ?? defaultName
}
```

You can accomplish the same logic without these newer ECMAScript features, but the code will be a lot more verbose and error-prone.

## Prefer loose array bounds checks over more brittle exact checks

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

## Prefer readonly and Partial utility types

`Readonly` and `Partial` are great defensive types that should be used where possible to prevent unintended mutations, but we don't require their use in this codebase.

```ts
function createUser(user: Readonly<Partial<User>>) {
  // Now 'user' is a readonly object, preventing accidental mutations
  return {
    ...user,
    id: '...'
  }
}

createUser({ name: 'Alex' })
```

## Ensure exhaustiveness in switch statements

```ts
type Action = 'create' | 'update' | 'delete'

function performAction(action: Action) {
  switch (action) {
    case 'create':
      // Handle create
      break

    case 'update':
      // Handle update
      break

    case 'delete':
      // Handle delete
      break

    default:
      throw new Error(`Unexpected action "${action}"`)
  }
}
```

## Use defensive error handling

Prefer wrapping potentially error-prone operations (e.g., network requests, file I/O) in `try-catch` blocks to handle and gracefully recover from unexpected runtime errors.
