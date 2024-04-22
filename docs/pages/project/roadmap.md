# Roadmap

## MVP Public Release

- rule file format
  - add support for `bad ⇒ good` examples for autofixing
- rules
  - **add new rules**
  - rewrite `liberal-accept-strict-produce` to be less verbose and have better examples
  - rewrite `prefer-types-always-valid-states`
  - finish `effective-eslint-config`
  - finish `effective-tsconfig`
- project
  - bundling default rules
  - stress test w/ real-world repos
  - add a why doc
  - add a [security policy](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository) ([example](https://github.com/Portkey-AI/gateway/blob/main/SECURITY.md))
  - social image for docs and launch
  - publish to NPM
  - public launch! 🚀

## Post-MVP

- cross-file linting (likely using [tree-sitter](https://tree-sitter.github.io/tree-sitter/); see my [initial exploration](https://twitter.com/transitive_bs/status/1776353458813112353))
  - add embedding support for files and functions
  - add DRY rule for detecting near duplicates
- explore using `gritql` to optimize context for built-in rules
- add support for different programming languages
- add support for applying autofixes to linter errors
- track the positive instances where we see rule conformance as well?
  - could help us output a better picture of overall code health
- fine-tuning pipeline for base linting task
- fine-tuning pipeline for individual rules
- explore reinforcement learning with continuous fine-tuning so rule accuracy improves over time
- explore generating rule definitions from an existing repo (PRs, unique code patterns, etc)
- experiment with ways of making the number of LLM calls sublinear w.r.t. the number of files
  - experiment with using bin packing to optimize context usage, but that's still same `O(tokens)`
- basic eval graphs and blog post
- linter engine
  - add support for git diffs
  - track eval results across multiple llm configs during CI
  - add `--dry-run` support for non-openai llm providers
  - move built-in configs into a separate package
  - improve error reporting to include approx line numbers
  - gracefully respect [rate limits](https://platform.openai.com/account/limits)
  - add support for [openai seed](https://platform.openai.com/docs/api-reference/chat/create#chat-create-seed) and `system_fingerprint` to help make the system more deterministic
  - handle context overflow properly depending on selected model
  - add support for comments explaining why it's okay to break a rule
  - **improve evals**
  - double-check against [openai best practices](https://platform.openai.com/docs/guides/prompt-engineering)
  - add additional unit tests to evals for edge cases
- demo video
- config
  - refactor config resolution - needs a major cleanup
    - reconsider rule `scope`
  - support rule overrides for specific file globs like eslint
  - support rule-specific settings like eslint
  - ensure precheck tasks are properly reported as cached
