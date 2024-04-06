# Prefer early returns from functions

| Key       | Value                                                            |
| --------- | ---------------------------------------------------------------- |
| Fixable   | false                                                            |
| Tags      | best practices                                                   |
| Languages | javascript, typescript                                           |
| Eslint    | `prefer-early-return`                                            |
| Resources | https://gomakethings.com/the-early-return-pattern-in-javascript/ |

Prefer returning early from functions in order to keep them as flat as possible.

Ignore `if` statements with multiple `else` branches.

`if` statements containing only a single statement in their body are okay and should be ignored by this rule.

### Bad

```js
function foo() {
  if (a) {
    b()
    c()
  }
}
```

```js
function handleClick(event) {
  if (event.target.matches('.save-data')) {
    let id = event.target.getAttribute('data-id')

    if (id) {
      let token = localStorage.getItem('token')

      if (token) {
        localStorage.setItem(`${token}_${id}`, true)
      }
    }
  }
}
```

### Good

```ts
function example() {
  const res = await fetch()
  if (!res) {
    return
  }

  // process res
}
```

```ts
function example() {
  const res = await fetch()
  if (!res) return

  // process res
}
```

```js
function foo() {
  if (!a) {
    return
  }

  b()
  c()
}
```

```js
function bar() {
  if (a) {
    b()
    c()
  }

  d()
}
```

```js
function baz() {
  if (a) {
    b()
    c()
  } else {
    d()
  }
}
```

```js
function foo() {
  if (a) {
    b()
  }
}
```

```js
function handleClick(event) {
  if (!event.target.matches('.save-data')) return

  let id = event.target.getAttribute('data-id')
  if (!id) return

  let token = localStorage.getItem('token')
  if (!token) return

  localStorage.setItem(`${token}_${id}`, true)
}
```
