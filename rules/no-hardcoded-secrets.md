---
fixable: false
gritqlNumLinesContext: 3
tags: [security]
languages: [all]
---

```grit
or { string(), template_string() } as $str where {
  $str <: not within import_statement(),
  $length = length($str),
  not or {
    $length <: 1,
    $length <: 2,
    $length <: 3,
    $length <: 4,
    $length <: 5,
    $length <: 6,
  }
}
```

# No hardcoded secrets

Sensitive secrets should never be hardcoded in git because they represent a serious security risk.

Common use cases for secrets include:

- private API keys and tokens
- authentication and authorization
- third-party service config
- private encryption keys
- cryptographic secrets for signing requests

The most common solution is to only access secrets from environment variables so they aren't committed as code.

### Bad

```js
const apiKey = 'sk-J6tsSvil9M7zF76PkyU...'
```

```js
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: 'sk-J6tsSvil9M7zF76PkyU...'
})
```

### Good

```js
const apiKey = process.env.OPENAI_API_KEY
```

```js
const apiKey = process.env['OPENAI_API_KEY']
```

```js
const apiKey = getEnv('OPENAI_API_KEY')
```

```ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})
```
