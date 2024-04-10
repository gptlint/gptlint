# Cost

_LLM costs can add up quickly._

[Two-pass linting](./guide/how-it-works.md#two-pass-linting) helps to significantly reduce costs by using a cheaper, weaker model for 95% of the work, but if you're running the linter on very large codebases, LLM costs can still add up quickly.

Every time you run `gptlint`, it will log the total cost of all LLM calls for that run (if you're using a supported provider).

Note that **this variable cost goes away when using a local LLM**, where you're paying directly for GPU compute instead of paying per token. For most projects, the cost of running `gptlint` will be _orders of magnitude cheaper_ than relying on your senior engineers to track and fix technical debt.

---

TODO: discuss how to use `--dry-run` to estimate costs before running the linter
TODO: add some real cost breakdowns
TODO: make it clear that gptlint is a **free, OSS project**, where you have explicit control over all LLM costs and dependencies.
