# Roadmap

## MVP Public Release

- linter engine
  - **improve evals**
    - [add unit tests to evals for edge cases](https://hamel.dev/blog/posts/evals/#step-2-create-test-cases)
      - will test the internal model outputs in addition to the top-level linting outputs
    - track eval results across multiple llm configs during CI
  - gracefully respect [rate limits](https://platform.openai.com/account/limits)
  - add support for [openai seed](https://platform.openai.com/docs/api-reference/chat/create#chat-create-seed) and `system_fingerprint` to help make the system more deterministic
  - handle context overflow properly depending on selected model
  - double-check against [openai best practices](https://platform.openai.com/docs/guides/prompt-engineering)
    - experiment with clearer delimiters in prompts vs markdown h1s
  - improve error reporting to include approx line numbers
    - post-mvp
  - **dry-run to estimate cost**
  - add support for comments explaining why it's okay to break a rule?
- rule file format
  - relax the examples parsing and lean into more flexible markdown support
- rules
  - **add new rules**
  - rewrite `liberal-accept-strict-produce` to be less verbose and have better examples
- config
  - refactor config resolution - needs a major cleanup
    - reconsider rule `scope`
  - support rule overrides for specific file globs like eslint
  - add ability to customize rule behavior with configs like eslint
  - move default rules to `.gptlint`
  - add built-in configs
    - need better rules
    - convert this repo to a monorepo?
    - post-mvp
- cli
  - cache precheck tasks
- project
  - add built-in rules to docs
  - decide on an OSS license
  - add a [security policy](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository) ([example](https://github.com/Portkey-AI/gateway/blob/main/SECURITY.md))
  - fix docs site dark mode logos
  - add social image to docs website
  - demo video
  - publish to NPM
  - public launch! 🚀

## Post-MVP

- cross-file linting (likely using [tree-sitter](https://tree-sitter.github.io/tree-sitter/); see my [initial exploration](https://twitter.com/transitive_bs/status/1776353458813112353))
  - add embedding support for files and functions
  - add DRY rule for detecting near duplicates
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
- add support for git diffs
- basic eval graphs and blog post
