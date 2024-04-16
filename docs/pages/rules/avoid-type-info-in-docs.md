# Don’t repeat type information in documentation

Avoid repeating type information in comments and variable names. In the best case it is duplicative of type declarations, and in the worst it will lead to conflicting information.

Consider including units in variable names if they aren’t clear from the type (e.g., timeMs or temperatureC).

Here is an example of incorrect code:

```ts
/**
 * Returns a string with the foreground color.
 * Takes zero or one arguments. With no arguments, returns the standard
 * foreground color. With one argument, returns the foreground color for a
 * particular page.
 */
function getForegroundColor(page?: string) {
  return page === 'login' ? { r: 127, g: 127, b: 127 } : { r: 0, g: 0, b: 0 }
}
```

This is a VIOLATION because the comment describes the types of the function parameters and return type which duplicates the more precise TS definition. Even worse, this example is a VIOLATION because the code and the comment contradict each other.

Let’s assume that the code represents the desired behavior. There are a few issues with this comment:

- It says that the function returns the color as a string when it actually returns an `{r, g, b}` object.
- It explains that the function takes zero or one arguments, which is already clear from the type signature.
- It’s needlessly wordy: the comment is longer than the function declaration and implementation.

Since your type annotations are checked by the TypeScript compiler, they’ll never get out of sync with the implementation.

A better comment might look like this:

```ts
/** Get the foreground color for the application or a specific page. */
function getForegroundColor(page?: string): Color {
  // ...
}
```

Comments about a lack of mutation are also suspect. Don’t just say that you don’t modify a parameter:

```ts
/** Does not modify nums */
function sort(nums: number[]) {
  /* ... */
}
```

Instead, declare the parameter as `readonly` and let TypeScript enforce the contract:

```ts
function sort(nums: readonly number[]) {
  /* ... */
}
```

## Caveats

Note that you do NOT have to include JSDoc comments for a function, and you do NOT have to include `@param` or `@returns` JSDoc properties. These are purely optional, but if they are included, they should not discuss the types of function parameters because TypeScript does a better job of capturing this info in the function definition itself.

If a comment is providing useful context or clarifying what a parameter is used for, then it should be ignored. This rule is only aimed at comments which duplicate type info or comments which imply immutability.

## Examples

### Correct Examples

```ts
/**
 * Upserts a user into the database.
 */
export async function upsertUser(
  user: User | NewUserData,
  ctx?: Context
): Promise<User> {
  // ...
}
```

```ts
/**
 * Upserts a user into the database.
 *
 * @param user - The user to upsert.
 * @param ctx - Optional context for the database operation.
 *
 * @returns The upserted user.
 */
export async function upsertUser(
  user: User | NewUserData,
  ctx?: Context
): Promise<User> {
  // ...
}
```

```ts
/**
 * Parses a string using a zod schema.
 *
 * @param output - string to parse
 * @param outputSchema - zod schema
 *
 * @returns parsed output
 */
export function parseStructuredOutput<T>(
  output: string,
  outputSchema: ZodType<T>
): T {
  // ...
}

// This example is fine because the type info in the JSDoc `@param` comments is relevant and simple.
```

## Metadata

| Key                   | Value                                     |
| --------------------- | ----------------------------------------- |
| name                  | `avoid-type-info-in-docs`                 |
| level                 | `error`                                   |
| scope                 | `file`                                    |
| fixable               | `false`                                   |
| cacheable             | `true`                                    |
| tags                  | `["best practices"]`                      |
| exclude               | `["**/*.test\\.{js,ts,jsx,tsx,cjs,mjs}"]` |
| resources             | `["https://effectivetypescript.com"]`     |
| gritqlNumLinesContext | `3`                                       |
| gritql                | `true`                                    |
