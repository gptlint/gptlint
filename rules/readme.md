# Built-In Rules

All markdown files in this directory (except this `readme.md`) are built-in [rule definition files](https://gptlint.dev/extend/rule-spec).

They are parsed and built into [src/built-in-rules.json](../src/built-in-rules.json) as part of the build process, so they don't have to be reloaded every time the linter runs.

If you want to rebuild the built-in rules, run `pnpm build` or more specifically `pnpm build:built-in-rules`. If you're iterating on a rule, you can alternatively ignore the built-in rules and run `tsx bin/gptlint.ts -r rules/path-to-your-rule.md` which will load and parse your rule directly, bypassing any built-in rules.
