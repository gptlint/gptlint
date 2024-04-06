# No hardcoded secrets

| Key       | Value    |
| --------- | -------- |
| Level     | error    |
| Fixable   | false    |
| Tags      | security |
| Languages | all      |

Sensitive secrets should never be hardcoded in git because they represent a serious security risk.

Common use cases for secrets include:

- private API keys and tokens
- authentication and authorization
- third-party service config
- private encryption keys
- cryptographic secrets for signing requests

The most common solution is to only access secrets from environment variables so they aren't committed as code.

## Suggestions

Other solutions include tools like:

- [Hashicorp Vault](https://www.vaultproject.io)
- [Infiscal](https://infisical.com)
- [Doppler](https://www.doppler.com)
- [sops](https://github.com/getsops/sops)
- [chamber](https://github.com/segmentio/chamber)
- [AWS parameter store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS Vault](https://github.com/99designs/aws-vault)

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
