---
fixable: false
tags: [best practices]
languages: [javascript, typescript]
scope: project
exclude:
  - '**/*.test\.{js,ts,jsx,tsx,cjs,mjs}'
---

# Non-file scope rules don't support gritql

```grit
or {
  do_statement(),
  while_statement(),
  for_statement()
}
```
