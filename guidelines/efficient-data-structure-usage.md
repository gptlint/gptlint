# Use efficient data structures

| Key       | Value                            |
| --------- | -------------------------------- |
| Name      | `efficient-data-structure-usage` |
| Level     | error                            |
| Fixable   | false                            |
| Tags      | performance                      |
| Languages | javascript, typescript           |

Using appropriate data structures is crucial for writing efficient and performant code. This rule identifies cases where a more efficient data structure could be used to improve performance and readability.

When choosing a data structure, consider the following:

- For simple key-value pairs, use an object (`{}`) when the keys are known and limited, and use a `Map` when the keys are dynamic or not known in advance.
- For storing unique values, use a `Set` instead of an array to avoid duplicates and improve lookup performance.
- For ordered data, use an array (`[]`) when the order is important and the size is relatively small. For larger datasets or when frequent insertions/deletions are required, consider using a linked list or a tree-based data structure.
- For stack or queue operations, use the built-in `Array` methods (`push`, `pop`, `shift`, `unshift`) instead of manually manipulating the array.
- For complex data structures or specific use cases, consider using libraries like Immutable.js or implementing custom data structures tailored to your needs.

- If the performance impact of using a less efficient data structure is negligible in the given context, it can be ignored.
- If using a specific data structure is required for compatibility reasons or integrating with external libraries, it should be ignored.

When suggesting a more efficient data structure, provide a clear explanation of the benefits and consider the trade-offs involved. If you are unsure whether a data structure usage violates the rule or if the suggested alternative is appropriate, err on the side of ignoring it or set `confidence` to `low`.

### Bad

```ts
const uniqueItems = []
for (const item of items) {
  if (!uniqueItems.includes(item)) {
    uniqueItems.push(item)
  }
}

const counts = {}
for (const item of items) {
  if (counts[item]) {
    counts[item]++
  } else {
    counts[item] = 1
  }
}
```

### Good

```ts
const uniqueItems = new Set(items)

const counts = new Map()
for (const item of items) {
  counts.set(item, (counts.get(item) || 0) + 1)
}
```
