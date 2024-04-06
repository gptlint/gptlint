# Prefer defensive programming techniques <!-- omit from toc -->

| Key       | Value                  |
| --------- | ---------------------- |
| Level     | error                  |
| Fixable   | false                  |
| Tags      | best practices         |
| Languages | javascript, typescript |

Defensive programming is a mindset where aimed at proving software quality and reliability by writing code with unexpected failures or inputs in mind. Defensive coding is proactive in failing fast, handling errors, validating inputs, and maintaining consistent state under unexpected conditions, ensuring that programs behave correctly even in unforeseen scenarios.

The following defensive programming techniques should be used whenever applicable:

- [Validate external data with type guards or schema validation](#validate-external-data-with-type-guards-or-schema-validation)
- [Use optional chaining and nullish coalescing where appropriate](#use-optional-chaining-and-nullish-coalescing-where-appropriate)
- [Prefer loose array indexing checks over brittle exact checks](#prefer-loose-array-indexing-checks-over-brittle-exact-checks)
- [Prefer readonly and Partial utility types](#prefer-readonly-and-partial-utility-types)
- [Ensure exhaustiveness in switch statements](#ensure-exhaustiveness-in-switch-statements)
- [Use defensive error handling](#use-defensive-error-handling)

## Validate external data with type guards or schema validation

When dealing with data from external sources (like APIs), don't just trust the payload matches your interfaces. Use type guards to validate the shape and type of the data at runtime.

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

## Use optional chaining and nullish coalescing where appropriate

Code written with a defensive mindset will often contain a lot of optional chaining (`?.`) and nullish coalescing (`??`).

```ts
function getFirstName(user?: User, defaultName = 'john'): string {
  return user?.name?.split(' ')[0] ?? defaultName
}
```

You can accomplish the same logic without these newer ECMAScript features, but the code will be a lot more verbose and error-prone.

## Prefer loose array indexing checks over brittle exact checks

Array bounds checks within loops should verify if a variable is `>=` or `<=` the array length instead of exactly equal to the array length. Performing strict bound checks on arrays is brittle and a common cause of subtle bugs.

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

createUser({ name: 'Alex' }) // OK, even without 'id'
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
