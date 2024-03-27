# Prefer using Array.at when indexing from the end of an array

| Key       | Value                             |
| --------- | --------------------------------- |
| Name      | prefer-array-at-negative-indexing |
| Level     | error                             |
| Fixable   | true                              |
| Tags      | general                           |
| Languages | javascript, typescript            |

When accessing items in an array from the end, like the last item, prefer using `Array.at` with a negative index because it is less error-prone. Note that using `Array.at` with a positive index is equivalent to indexing into the array normally, and if `Array.at` references a non-existing index, it will return `undefined`.

### Bad

```ts
const items = [1, 2, 3, 4, 5, 6, 7]
const lastItem = items[items.length - 1]
```

### Good

```ts
const items = [1, 2, 3, 4, 5, 6, 7]
const lastItem = items.at(-1)
```
