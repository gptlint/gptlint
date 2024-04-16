# No hardcoded secrets

Sensitive secrets should never be hardcoded in git because they represent a serious security risk.

Common use cases for secrets include:

- private API keys and tokens
- authentication and authorization
- third-party service config
- private encryption keys
- cryptographic secrets for signing requests

The most common solution is to only access secrets from environment variables so they aren't committed as code.

## Examples

### Incorrect Examples

```js
const apiKey = 'sk-J6tsSvil9M7zF76PkyU...'
```

```js
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: 'sk-J6tsSvil9M7zF76PkyU...'
})
```

### Correct Examples

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

## Metadata

| Key                   | Value                  |
| --------------------- | ---------------------- |
| name                  | `no-hardcoded-secrets` |
| level                 | `error`                |
| scope                 | `file`                 |
| fixable               | `false`                |
| cacheable             | `true`                 |
| tags                  | `["security"]`         |
| gritqlNumLinesContext | `3`                    |
| gritql                | `true`                 |
