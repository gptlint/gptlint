# Always handle Promises

| Key       | Value                    |
| --------- | ------------------------ |
| Name      | `always-handle-promises` |
| Level     | error                    |
| Fixable   | false                    |
| Tags      | general                  |
| Languages | javascript, typescript   |

Promises (and `async` functions which implicitly create Promises) must always be handled at some level of the program, either via:

- using `await` to wait for the Promise to resolve successfully
- using `.then` or `.catch` to handle Promise resolution
- returning a Promise to a calling function which itself has to handle the Promise

Creating a Promise or calling an `async` function and NOT awaiting or propagating the resulting Promise using one of these approaches is a code smell and violates this rule.

### Bad

```js
async function saveFile() {
  // ...
}

// This is bad because we're not handling the Promise returned by `saveFile`
saveFile()
```

### Good

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
