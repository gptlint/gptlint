# Prefer using Array.at when indexing from the end of an array

When accessing items in an array from the end, like the last item, prefer using `Array.at` with a negative index because it is less error-prone. Note that using `Array.at` with a positive index is equivalent to indexing into the array normally, and if `Array.at` references a non-existing index, it will return `undefined`.

## Examples

### Incorrect Examples

```ts
const items = [1, 2, 3, 4, 5, 6, 7]
const lastItem = items[items.length - 1]
```

### Correct Examples

```ts
const items = [1, 2, 3, 4, 5, 6, 7]
const lastItem = items.at(-1)
```

```ts
const items = [1, 2, 3, 4, 5, 6, 7]

// This example is fine because it uses a normal, positive index
const firstItem = items[0]
```

```ts
const items = [1, 2, 3, 4, 5, 6, 7]
const index = example()

// This example is fine because it uses a variable index
const item = items[index]
```

## Metadata

| Key                   | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| name                  | `prefer-array-at-negative-indexing`                           |
| level                 | `error`                                                       |
| scope                 | `file`                                                        |
| fixable               | false                                                         |
| cacheable             | true                                                          |
| tags                  | [ `best practices` ]                                          |
| eslint                | [ `@unicorn/prefer-negative-index` ]                          |
| resources             | [ `https://twitter.com/housecor/status/1768622518179369036` ] |
| gritqlNumLinesContext | 3                                                             |
| gritql                | true                                                          |
