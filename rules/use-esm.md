# Use ESM instead of CommonJS

| Key       | Value                  |
| --------- | ---------------------- |
| Name      | `use-esm`              |
| Level     | error                  |
| Fixable   | false                  |
| Tags      | general                |
| Languages | javascript, typescript |

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
