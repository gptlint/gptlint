# Prefer page queries

This rule provides suggestions

- Category: Code best practices
- Rule name: `@pmd_eslint/prefer-page-queries`
- Requires GraphQL Schema: `false`
- Requires GraphQL Operations: `false`

Warn on usage of the /utils/api.ts file in favor of creating a page query in the /utils/pageQueries folder

## Usage Examples

# Incorrect

`/utils/api.ts`

```ts
export const get<queryName>Data = async (
  locale: string
): Promise<<queryName>Type | null> => {
  try {
    const data = await fetchCmsGraphql(GET_<queryName>, {
      locale,
    });
    return data?.<queryName>?.data?.attributes || null;
  } catch (error) {
    console.error(error);
    return null;
  }
};
```

# Correct

`/utils/pageQueries/<queryName>/index.ts`

```ts
import { print } from 'graphql';
import {
  <queryName>Query,
  <queryName>QueryVariables,
} from './AboutUsPage.generated';
export type { <queryName>Query, <queryName>QueryVariables };
import QUERY from './AboutUsPage';
import { fetchCmsGraphql } from '../../fetchCmsData';

export const get<queryName>PageData = async (
  variables: <queryName>PageQueryVariables
): Promise<<queryName>Query | null> => {
  try {
    const data = await fetchCmsGraphql(print(QUERY), variables);
    return data as <queryName>Query;
  } catch (error) {
    console.error(error);
    return null;
  }
};

```

`/utils/pageQueries/<queryName>/<queryName>.tsx`

```tsx
import gql from "graphql-tag";

export default gql`
  query <queryName> {
  # query here
  }
`;
```
