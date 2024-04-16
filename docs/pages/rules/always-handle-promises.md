# Always handle Promises

Promises (and `async` functions which implicitly create Promises) must always be handled at some level of the program, either via:

- using `await` to wait for the Promise to resolve successfully
- using `.then` or `.catch` to handle Promise resolution
- returning a Promise to a calling function which itself has to handle the Promise

Creating a Promise or calling an `async` function and NOT awaiting or propagating the resulting Promise using one of these approaches is a code smell and violates this rule.

**Important**: This rule should only apply to function calls which you are 100% sure return a `Promise`. If you do not know for sure that a function returns a `Promise`, then disregard it.

## Metadata

| Key       | Value                    |
| --------- | ------------------------ |
| name      | `always-handle-promises` |
| level     | `error`                  |
| scope     | `file`                   |
| fixable   | `false`                  |
| cacheable | `true`                   |
| tags      | `["best practices"]`     |

## Examples

### Incorrect Examples

```js
async function saveFile() {
  // ...
}

// This is bad because we're not handling the Promise returned by `saveFile`
saveFile()
```

### Correct Examples

```js
async function saveFile() {
  // ...
}

// This is fine because we explicitly `await` the Promise returned by `saveFile`
await saveFile()
```

```js
async function saveFile() {
  // ...
}

// This is fine because the Promise returned from `saveFile` is propagated to `main`'s caller
async function main() {
  return saveFile()
}
```

```js
async function saveFile() {
  // ...
}

// This is fine because we explicitly `await` the promise results
await Promise.all([saveFile(), saveFile()])
```
