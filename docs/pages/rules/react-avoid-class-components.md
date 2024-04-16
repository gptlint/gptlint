# Don't use React class components

React class components are deprecated. Use React functions and hooks instead.

Note that uses `classes` is fine for non-react components.

## Metadata

| Key       | Value                                               |
| --------- | --------------------------------------------------- |
| name      | `react-avoid-class-components`                      |
| level     | `error`                                             |
| scope     | `file`                                              |
| fixable   | `false`                                             |
| cacheable | `true`                                              |
| tags      | `["react"]`                                         |
| eslint    | `["eslint-plugin-react-prefer-function-component"]` |
| include   | `["**/*.{jsx,tsx}"]`                                |
| gritql    | `true`                                              |

## Examples

### Incorrect Examples

```tsx
import { Component } from 'react'

export class Label extends Component {
  render() {
    return <div>Hello</div>
  }
}
```

```tsx
import react from 'react'

export class Label extends react.Component {
  render() {
    return <div />
  }
}
```

### Correct Examples

```tsx
export function Button() {
  return <div>Hello</div>
}
```

```ts
import EventEmitter from 'eventemitter3'

// This is fine because it is a normal class and not a React component.
class Foo extends EventEmitter {
  constructor() {}
}
```
