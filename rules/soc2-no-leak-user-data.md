---
fixable: false
gritqlNumLinesContext: 2
tags: [security]
languages: [javascript, typescript]
---

```grit
or {
  `console.$method($args)`,
  `logger.$method($args)`,
  `log.$method($args)`,
  `throw new $Error($msg)`
}
```

# SOC2 Don't leak user data

Don't log potentially sensitive customer data or we'll lose our SOC2 certification.

Non-identifying user data such as internal IDs or other internal models related to a user are fine to log and expose.

### Bad

```js
// Don't log potentially sensitive user data
console.log(user)
```

```js
// Don't log potentially sensitive user data
log.info(user)
```

```js
// Don't log sensitive user information like `email`
console.error('Invalid user', user.email)
```

```js
// Don't log request bodies which may contain sensitive user data
log.info({ body: req.body })
```

```js
// Don't expose request bodies which may contain sensitive user data
throw new Error('error', { body: req.body })
```

### Good

```js
// Logging non-identifying user data such as internal IDs is fine
console.log(user.id)
```

```js
// Logging non-identifying user data such as internal IDs is fine
logger.warn(`Invalid user: ${user.id}`)
```

```ts
// Exposing non-identifying user data such as internal IDs is fine
throw new Error(`User error ${user.id}`)
```

```js
// Logging internal resources related to a user is okay
console.log(user.posts)
```
