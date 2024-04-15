---
fixable: false
tags: [best practices]
languages: [javascript, typescript]
exclude:
  - '**/*.test\.{js,ts,jsx,tsx,cjs,mjs}'
eslint:
  - prefer-early-return
resources:
  - https://gomakethings.com/the-early-return-pattern-in-javascript/
---

# Prefer early returns from functions

Prefer returning early from functions in order to keep them as flat as possible.

Ignore `if` statements with multiple `else` branches.

Ignore `if` statements which include a `return` or `throw` in their body.

`if` statements containing only a single statement in their body are okay and should be ignored by this rule.

```grit
function_declaration
```

### Bad

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
  if (a) {
    b()
  }
}
```
