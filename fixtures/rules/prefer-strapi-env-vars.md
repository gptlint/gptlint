# Use Strapi Environment Variables

| Key       | Value                  |
| --------- | ---------------------- |
| Name      | `strapi-env-vars`      |
| Level     | error                  |
| Fixable   | true                   |
| Tags      | code smells            |
| Languages | javascript, typescript |

Avoid accessing `process.env` variables in favor of Strapi environment variables.

## Usage Examples

### Incorrect

```ts
export default ({ env }) => ({
  auth: {
    secret: process.env['ADMIN_JWT_SECRET']
  }
})
```

```ts
export default ({ env }) => ({
  auth: {
    secret: process.env.ADMIN_JWT_SECRET
  }
})
```

### Correct

```ts
export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')
  }
})
```
