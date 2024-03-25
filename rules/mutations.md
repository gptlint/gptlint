# Mutation Inputs

This rule provides suggestions

- Category: Schema & Operations
- Rule name: `@ux-l_graphql-eslint/mutation-types`
- Requires GraphQL Schema: `false`
- Requires GraphQL Operations: `false`

Disallow empty arguments for mutation Enforcing naming conventions for mutation input names and mutation return types

## Usage Examples

`.eslintrc`

```json
{
  "rules": {
    "@ux-l_graphql-eslint/mutation-types": "error"
  }
}
```

### Incorrect

```graphql
type Mutation {
  setMessage(message: SetMessageInput, other: String): String
}
type Mutation {
  setMessage(message: String): String
}
type Mutation {
  setMessage: String
}
type Mutation {
  setMessage(input: setMessageInput): setMessageResponse
}
```

### Correct

```graphql
type Mutation {
  setMessage(input: SetMessageInput): SetMessageResponse
}
type Mutation {
  setMessage(input: [SetMessageInput]): SetMessageResponse
}
```
