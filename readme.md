<p align="center">
  <a href="https://gptlint.dev"><img alt="How it works" src="/docs/public/gptlint-logo.png" width="256"></a>
</p>

<p align="center">
  <em>Use LLMs to enforce best practices across your codebase.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/gptlint"><img alt="NPM" src="https://img.shields.io/npm/v/gptlint.svg" /></a>
  <a href="https://github.com/gptlint/gptlint/actions/workflows/test.yml"><img alt="Build Status" src="https://github.com/gptlint/gptlint/actions/workflows/main.yml/badge.svg" /></a>
  <a href="https://github.com/gptlint/gptlint/blob/main/license"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue" /></a>
  <a href="https://prettier.io"><img alt="Prettier Code Formatting" src="https://img.shields.io/badge/code_style-prettier-brightgreen.svg" /></a>
  <a href="https://twitter.com/transitive_bs"><img alt="Discuss on Twitter" src="https://img.shields.io/badge/twitter-discussion-blue" /></a>
</p>

# GPTLint <!-- omit from toc -->

> A fundamentally new approach to code quality. Use LLMs to enforce higher-level best practices across your codebase in a way that takes traditional static analysis tools like `eslint` to the next level.

- [Features](#features)
- [Demo](#demo)
- [How it works](#how-it-works)
- [Getting Started](#getting-started)
- [FAQ](#faq)
- [Citations](#citations)
- [License](#license)

## Features

- ✅️ _enforce higher-level best practices that are impossible with ast-based approaches_
- ✅️ simple markdown format for rules ([example](./rules/prefer-array-at-negative-indexing.md), [spec](https://gptlint.dev/extend/rule-spec))
- ✅️ easy to [disable](https://gptlint.dev/project/faq#how-can-i-disable-a-rule) or [customize](https://gptlint.dev/project/faq#how-can-i-customize-a-built-in-rule) rules
- ✅️ add custom, [project-specific rules](https://gptlint.dev/guide/rule-guidelines#project-specific-rules)
- ✅️ same cli and config format as `eslint`
- ✅️ supports `gptlint.config.js` and inline overrides `/* gptlint-disable */`
- ✅️ content-based caching
- ✅️ outputs LLM stats per run (cost, tokens, etc)
- ✅️ built-in rules are extensively tested w/ [evals](https://gptlint.dev/project/how-it-works#evals)
- ✅️ supports all major [LLM providers](https://gptlint.dev/guide/llm-providers) and [local models](https://gptlint.dev/guide/llm-providers#local-models)
- ✅️ augments `eslint` instead of trying to replace it (_we love eslint!_)
- ✅️ includes [guidelines](https://gptlint.dev/extend/rule-guidelines) for creating your own rules
- ❌ MVP rules are [JS/TS only](https://gptlint.dev/project/limitations#rules-in-the-mvp-are-jsts-only) _for now_
- ❌ MVP rules are [single-file context only](https://gptlint.dev/project/limitations#rules-in-the-mvp-are-single-file-only) _for now_
- ❌ MVP does not support [autofixing](https://gptlint.dev/project/limitations#the-mvp-does-not-support-autofixing-lint-errors) _for now_

## Demo

Here's a demo of `gptlint` running on its own codebase:

<p align="center">
  <img width="640" src="/docs/public/demo.svg">
</p>

Check out our [docs](https://gptlint.dev/guide) to get started.

## How it works

<p align="center">
  <a href="https://gptlint.dev/project/how-it-works"><img alt="How it works" src="/docs/public/how-gptlint-works.png"></a>
</p>

Check out our [docs on how it works](https://gptlint.dev/project/how-it-works) to learn more.

## Getting Started

Installation is simple, with the only external dependency required by default being an OpenAI API key.

Check out our [docs](https://gptlint.dev/guide) to get started.

## FAQ

- [How accurate / reliable is gptlint?](https://gptlint.dev/project/accuracy)
- [How much will it cost to run gptlint on my codebase?](https://gptlint.dev/project/cost)
- [How can I use GPTLint with a custom, local model?](https://gptlint.dev/guide/llm-providers#local-models)
- [How can I use GPTLint with a different LLM provider?](https://gptlint.dev/guide/llm-providers)
- [How can I disable a rule?](https://gptlint.dev/project/faq)
- [How can I disable a rule for a specific file?](https://gptlint.dev/project/faq)
- [How can I disable linting for a specific file?](https://gptlint.dev/project/faq)
- [How can I customize a built-in rule?](https://gptlint.dev/project/faq)
- [Are there file size limits?](https://gptlint.dev/project/faq)
- [What limitations does GPTLint have?](https://gptlint.dev/project/limitations)
- [How does GPTLint compare to ESLint?](https://gptlint.dev/project/faq)
- [What about fine-tuning?](https://gptlint.dev/project/faq)
- [Where can I get support?](https://gptlint.dev/project/faq)

## Citations

```bibtex
@software{agentic2024gptlint,
  title  = {GPTLint},
  author = {Travis Fischer, Scott Silvi},
  year   = {2024},
  month  = {4},
  url    = {https://github.com/gptlint/gptlint}
}
```

Huge shoutout to [Laurentiu Raducu](https://twitter.com/Bitheap_tech) for gifting us the NPM package name. 🙏

## License

MIT © [Travis Fischer](https://twitter.com/transitive_bs)

To stay up to date or learn more, follow [@transitive_bs](https://twitter.com/transitive_bs) on Twitter.
