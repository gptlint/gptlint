# Use Strapi Environment Variables

This rule provides suggestions

- Category: Code Smells
- Rule name: `@pmd/strapi-env-vars`
- Requires GraphQL Schema: `false`
- Requires GraphQL Operations: `false`
- Fixable: true

Suggest & Fix usage of process.env variables in favor of Strapi environment variables

## Usage Examples

# Incorrect

```ts
export default ({ env }) => ({
  auth: {
    secret: process.env['ADMIN_JWT_SECRET'],
  }
});
```

```ts
export default ({ env }) => ({
  auth: {
    secret: process.env.ADMIN_JWT_SECRET,
  },
});
```

# Correct
```ts
export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
});
```
