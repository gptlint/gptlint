# Force List Pagination

| Key       | Value                  |
| --------- | ---------------------- |
| Name      | force-list-pagination  |
| Level     | error                  |
| Fixable   | false                  |
| Tags      | graphql                |
| Languages | javascript, typescript |

Force the use of pagination for all lists in GraphQL.

## Usage Examples

### Incorrect

```graphql
type Query {
  items: [ItemConnection]
  requiredItems: [ItemConnection!]
  nestedRequireItems: [ItemConnection!]!
}
```

### Correct

```graphql
type ListPaginationInput {
  first: Int
  last: Int
  after: String
  before: String
}

type Query {
  items(pagination: ): [ItemConnection]
  requiredItems: [ItemConnection!]
  nestedRequireItems: [ItemConnection!]!
}
```
