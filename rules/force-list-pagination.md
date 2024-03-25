# Force List Pagination

This rule provides suggestions

- Category: Schema & Operations
- Rule name: `@pmd/force-list-pagination`
- Requires GraphQL Schema: `false`
- Requires GraphQL Operations: `false`
- Fixable: true

Force the use of pagination for all lists in GraphQL

## Usage Examples

# Incorrect

```graphql
type Query {
  items: [ItemConnection]
  requiredItems: [ItemConnection!]
  nestedRequireItems: [ItemConnection!]!
}
```

# Correct

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
