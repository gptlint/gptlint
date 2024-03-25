# Prefer Edges & Nodes

This rule provides suggestions

- Category: Schema & Operations
- Rule name: `@pmd/prefer-edge-node`
- Requires GraphQL Schema: `false`
- Requires GraphQL Operations: `false`

Prefer usage of Edges and Nodes in GraphQL Lists

## Usage Examples

# Incorrect

```graphql
type Query {
  items: [Item]
  requiredItems: [Item!]
  nestedRequireItems: [Item!]!
}

type Item {
  id: ID
  name: String
}
```

# Correct

```graphql
type Item {
  id: ID
  name: String
}

type ItemEdge {
  node: Node!
  cursor: String!
}

type ItemConnection {
  edges: [ItemEdge]
  pageInfo: PageInfo!
}

type PageInfo {
  endCursor: String
  hasNextPage: Boolean!
  resultCount: Int!
}

type Query {
  items: [ItemConnection]
  requiredItems: [ItemConnection!]
  nestedRequireItems: [ItemConnection!]!
}
```
