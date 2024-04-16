---
eslint:
  - '@unicorn/prefer-module'
  - '@typescript-eslint/no-require-imports'
---

# Use ESM instead of CommonJS

CommonJS code is deprecated and should be avoided going forwards. CommonJS code uses `require` and `module.exports` and suffers from poor standardization and interoperability issues.

ESM (ECMAScript Modules) is a modern standard which uses `import` and `export` statements. It is preferred for all JS/TS code going forwards.

### Bad

```js
const path = require('path')

module.exports = function foo() {}
```

### Good

```js
import path from 'path'

export default function foo() {}
export function bar() {}
```
