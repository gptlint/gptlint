# Prefer Edges & Nodes

| Key       | Value                                 |
| --------- | ------------------------------------- |
| Name      | `prefer-edge-node`                    |
| Level     | error                                 |
| Fixable   | false                                 |
| Tags      | graphql                               |
| Languages | javascript, typescript                |
| Eslint    | `@ux-l_graphql-eslint/mutation-types` |

Prefer usage of Edges and Nodes in GraphQL Lists.

## Usage Examples

### Incorrect

```graphql
type Item {
  id: ID
  name: String
}

type Query {
  items: [Item]
  requiredItems: [Item!]
  nestedRequireItems: [Item!]!
}
```

### Correct

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
