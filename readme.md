<p align="center">
  <img alt="How it works" src="/media/gptlint-logo.png" width="256">
</p>

<p align="center">
  <em>Use LLMs to enforce best practices across your codebase</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/gptlint"><img alt="NPM" src="https://img.shields.io/npm/v/gptlint.svg" /></a>
  <a href="https://github.com/transitive-bullshit/eslint-plus-plus/actions/workflows/test.yml"><img alt="Build Status" src="https://github.com/transitive-bullshit/eslint-plus-plus/actions/workflows/main.yml/badge.svg" /></a>
  <a href="https://github.com/transitive-bullshit/eslint-plus-plus/blob/main/license"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue" /></a>
  <a href="https://prettier.io"><img alt="Prettier Code Formatting" src="https://img.shields.io/badge/code_style-prettier-brightgreen.svg" /></a>
  <a href="https://twitter.com/transitive_bs"><img alt="Discuss on Twitter" src="https://img.shields.io/badge/twitter-discussion-blue" /></a>
</p>

# GPTLint <!-- omit from toc -->

> A fundamentally new approach to code quality. Use LLMs to enforce higher-level best practices across your codebase in a way that takes traditional static analysis tools like `eslint` to the next level.

- [Features](#features)
- [Demo](#demo)
- [Install](#install)
- [Usage](#usage)
- [CLI](#cli)
- [LLM Providers](#llm-providers)
  - [OpenAI](#openai)
  - [Anthropic](#anthropic)
  - [Local Models](#local-models)
- [How it works](#how-it-works)
- [Caveats](#caveats)
  - [Accuracy](#accuracy)
  - [Cost](#cost)
  - [Rules in the MVP are single-file only](#rules-in-the-mvp-are-single-file-only)
  - [Rules in the MVP are JS/TS only](#rules-in-the-mvp-are-jsts-only)
  - [The MVP does not support autofixing lint errors](#the-mvp-does-not-support-autofixing-lint-errors)
- [FAQ](#faq)
- [Roadmap](#roadmap)
  - [MVP Public Release](#mvp-public-release)
  - [Post-MVP](#post-mvp)
- [Citations](#citations)
- [License](#license)

## Features

- ✅️ _enforce higher-level best practices that are impossible with ast-based approaches_
- ✅️ simple markdown format for rules ([example](./rules/prefer-array-at-negative-indexing.md), [spec](./docs/rule-spec.md))
- ✅️ easy to [disable](#how-can-i-disable-a-rule) or [customize](#how-can-i-customize-a-rule) rules
- ✅️ add custom, [project-specific rules](./docs/rule-guidelines.md#project-specific-rules)
- ✅️ same cli and config format as `eslint`
- ✅️ supports `gptlint.config.js` and inline overrides `/* gptlint-disable */`
- ✅️ content-based caching
- ✅️ outputs LLM stats per run (cost, tokens, etc)
- ✅️ built-in rules are extensively tested w/ [evals](./docs/how-it-works.md#evals)
- ✅️ supports all major [LLM providers](#llm-providers)
- ✅️ supports all major [local LLMs](#local-models)
- ✅️ augments `eslint` instead of trying to replace it (_we love eslint!_)
- ✅️ includes [guidelines](./docs/rule-guidelines.md) for creating your own rules
- ❌ MVP rules are [JS/TS only](#rules-in-the-mvp-are-jsts-only) _for now_
- ❌ MVP rules are [single-file context only](#rules-in-the-mvp-are-single-file-only) _for now_
- ❌ MVP does not support [autofixing](#the-mvp-does-not-support-autofixing-lint-errors) _for now_

## Demo

Here's a demo of `gptlint` running on its own codebase:

<p align="center">
  <img width="640" src="/media/demo.svg">
</p>

## Install

> [!CAUTION]
> This tool isn't published to `npm` yet, so use `tsx bin/lint.ts` instead of the following usage examples. This requires you to checkout the code locally and install deps with `pnpm i`.

```sh
npm install -D gptlint
```

It is recommended to install `gptlint` as a dev dep just like `eslint`.

## Usage

> [!CAUTION]
> This tool isn't published to `npm` yet, so use `tsx bin/lint.ts` instead of the following usage examples. This requires you to checkout the code locally and install deps with `pnpm i`.

```sh
echo "OPENAI_API_KEY='your openai api key'" >> .env
npx gptlint

# or

export OPENAI_API_KEY='your openai api key'
npx gptlint

# or

npx gptlint -k 'your openai api key'
```

By default, `gptlint` uses `**/*.{js,ts,jsx,tsx,cjs,mjs}` as a file glob for source files to lint and `rules/**/*.md` for rule definition files.

`gptlint` respects `.gitignore` and optionally `.gptlintignore` as well if it exists.

## CLI

```bash
Usage:
  gptlint [flags...] [file/dir/glob ...]

Flags:
      --api-base-url <string>               Base URL for the LLM API to use which must be compatible with the OpenAI
                                            chat completions API. Defaults to the OpenAI API (default:
                                            "https://api.openai.com/v1")
  -k, --api-key <string>                    API key for the OpenAI-compatible LLM API. Defaults to the value of the
                                            `OPENAI_API_KEY` environment variable.
      --api-organization-id <string>        Optional organization ID that should be billed for LLM API requests. This is
                                            only necessary if your OpenAI API key is scoped to multiple organizations.
      --cache-dir <string>                  Customize the path to the cache directory (default:
                                            "/Users/tfischer/dev/modules/eslint++/node_modules/.cache/gptlint")
      --concurrency <number>                Limits the maximum number of concurrent tasks (default: 16)
  -c, --config <string>                     Path to a configuration file
  -d, --debug                               Enables debug logging
      --debug-config                        When enabled, logs the resolved config and parsed rules and then exits
  -D, --debug-model                         Enables verbose LLM logging
  -e, --early-exit                          Exits after finding the first error
  -h, --help                                Show help
      --ignore-file <string>                Path to file containing ignore patterns (default: ".gptlintignore")
      --ignore-pattern <string>             Pattern of files to ignore (in addition to .gptlintignore)
  -m, --model <string>                      Which LLM to use for assessing rule conformance (default: "gpt-4")
  -C, --no-cache                            Disables caching
  -S, --no-debug-stats                      Disables logging of cumulative LLM stats, including total tokens and cost
                                            (logging LLM stats is enabled by default)
      --no-ignore                           Disables the use of ignore files and patterns
      --no-inline-config                    Disables the use of inline rule config inside of source files
  -r, --rules <string>                      Glob pattern to rule definition markdown files. (default:
                                            ["rules/**/*.md"])
      --temperature <number>                LLM temperature parameter
```

## LLM Providers

This project supports any chat LLM which exposes an OpenAI-compatible chat completions API. Specific instructions for the most popular LLM providers and local, open source models are included below.

### OpenAI

This is the default. Just export an `OPENAI_API_KEY` environment variable either via your environment, a local `.env` file, or via the CLI `--apiKey` flag.

The default model is `gpt-4`. We're not using `gpt-4-turbo-preview` as the default because some developers don't have access to it. The default `weakModel` is `gpt-3.5-turbo` which is used for [two-pass linting](./docs/how-it-works.md#two-pass-linting).

If you have access to `gpt-4-turbo-preview`, it is recommended to use over `gpt-4` by adding a [config file](./gptlint.config.js) to your project. For example:

```js
// gptlint.config.js

/** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    llmOptions: {
      model: 'gpt-4-turbo-preview',
      weakModel: 'gpt-3.5-turbo'
    }
  }
]
```

### Anthropic

Anthropic Claude is supported by using a proxy such as [OpenRouter](https://openrouter.ai/).

- [Claude 3 Opus](https://openrouter.ai/models/anthropic/claude-3-opus:beta) (powerful, but very expensive)
- [Claude 3 Sonnet](https://openrouter.ai/models/anthropic/claude-3-sonnet:beta) (balanced)
- [Claude 3 Haiku](https://openrouter.ai/models/anthropic/claude-3-haiku:beta)

Export your OpenRouter API key as an `OPENAI_API_KEY` environment variable either via your environment, a local `.env` file, or via the CLI `--apiKey` flag.

```js
// gptlint.config.js

/** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    llmOptions: {
      apiBaseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3-opus:beta',
      weakModel: 'anthropic/claude-3-haiku:beta',
      // Optional
      kyOptions: {
        headers: {
          // Optional, for including your app on openrouter.ai rankings.
          'HTTP-Referer': 'https://github.com/GPTLint/GPTLint',
          // Optional, shows in rankings on openrouter.ai.
          'X-Title': 'gptlint'
        }
      }
    }
  }
]
```

### Local Models

- [ollama](https://github.com/ollama/ollama) supports exposing a local [OpenAI compatible server](https://github.com/ollama/ollama/blob/main/docs/openai.md)
- [vLLM](https://github.com/vllm-project/vllm) supports exposing a local [OpenAI compatible server](https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html)

Use the `apiBaseUrl` and `apiKey` config / CLI params to point GPTLint to your local model server.

In production, you may want to consider using a cloud provider that offers inference and fine-tuning APIs such as:

- [Together.ai](https://www.together.ai)
- [Anyscale](https://www.anyscale.com/private-endpoints)
- [Modal Labs](https://modal.com/use-cases/language-models)

## How it works

<p align="center">
  <a href="/docs/how-it-works.md"><img alt="How it works" src="/media/how-gptlint-works.png"></a>
</p>

See our [docs on how it works](./docs/how-it-works.md) for more details.

## Caveats

### Accuracy

This tool uses one or more LLMs to identify rule violations in your code (see [how it works](./docs/how-it-works.md) for details), so depending on the languag models and the quality of the rules you're using, it's possible for the linter to produce **false positives** (hallucinated errors which shouldn't have been reported) and/or **false negatives** (real errors that the tool missed).

**All built-in rules are extensively tested** with evals to ensure that the linter is as accurate as possible by default. We're also working on a more integrated feedback loop to gather data and improve the linter's quality over time. If you're in this feature, please [reach out to our team](mailto:gptlint@teamduality.dev).

Keep in mind that even expert human developers are unlikely to reach perfect accuracy when reviewing large codebases (we all miss things, get tired, get distracted, etc), **so the goal of this project is not to achieve 100% accuracy, but rather to surpass human expert-level accuracy on this narrow task at a fraction of the cost and speed**.

_(we're using accuracy here as a shorthand for precision / recall)_

### Cost

_LLM costs can add up quickly._

[Two-pass linting](./docs/how-it-works.md#two-pass-linting) helps to significantly reduce costs by using a cheaper, weaker model for 95% of the work, but if you're running the linter on very large codebases, LLM costs can still add up quickly.

Every time you run `gptlint`, it will log the total cost of all LLM calls for that run (if you're using a supported provider).

Note that **this variable cost goes away when using a local LLM**, where you're paying directly for GPU compute instead of paying per token. For most projects, the cost of running `gptlint` will be _orders of magnitude cheaper_ than relying on your senior engineers to track and fix technical debt.

### Rules in the MVP are single-file only

Many of the higher-level best practices we'd like to support span multiple files, but we also wanted to keep the MVP scoped, so we made the decision to restrict rules to the context of a single file _for now_.

This restriction will be removed once we've validated the MVP with the community, but it will likely remain as an optional rule-specific setting in the future to optimize rules which explicitly don't need multi-file context.

If you'd like to add a rule which requires multi-file context, [please open an issue to discuss](https://github.com/transitive-bullshit/eslint-plus-plus/issues/new).

### Rules in the MVP are JS/TS only

This project is inherently language-agnostic, but in order to keep the MVP scoped, we wanted to focus on the languages & ecosystem that we're most familiar with.

Post-MVP, we're hoping that rules for other programming languages and [library-specific rule configs](./docs/rule-guidelines.md#library-specific-rule-configs) will trickle in with help from the community over time.

### The MVP does not support autofixing lint errors

This is a feature we have planned in the near future once we'e validated that we're working with the right core rule abstraction.

## FAQ

### How can I disable a rule? <!-- omit from toc -->

You can disable a rule for a project by adding a config file at the root:

```js
// gptlint.config.js
export default [
  {
    rules: {
      'prefer-fetch-over-axios': 'off'
    }
  }
]
```

### How can I disable a rule for a specific file? <!-- omit from toc -->

Rules can be configured at the file-level using inline comments:

```ts
/* gptlint semantic-variable-names: off */
```

Separate multiple inline rule configs with commas:

```ts
/* gptlint use-esm: off, consistent-identifier-casing: warn */
```

Or use multiple inline rule config comments:

```ts
/* gptlint use-esm: off */
/* gptlint consistent-identifier-casing: warn */
```

### How can I disable linting for a specific file? <!-- omit from toc -->

Linting can be disabled at the file-level using an inline comment:

```ts
/* gptlint-disable */
```

### How can I customize a built-in rule? <!-- omit from toc -->

Since rules are just markdown files, copy the rule's markdown file from [rules/](./rules) into your project and customize it to suit your project's needs.

You'll want to [disable the original rule](#how-can-i-disable-a-rule) and change your custom rule's name to a project-specific name. Make sure your local config includes your custom rule's markdown file in its `ruleFiles` field.

If your change is generally applicable to other projects, consider opening a pull request to GPTLint.

For more guidance around creating and evaluating custom rules that will work well across large codebases as well as expertise on fine-tuning models for use with custom rules, please [reach out to our consulting partners](mailto:gptlint@teamduality.dev).

### What about fine-tuning? <!-- omit from toc -->

See our notes on [fine-tuning in how it works](./docs/how-it-works.md#fine-tuning).

### Where can I get help? <!-- omit from toc -->

For free, open source projects, feel free to DM me [@transitive_bs](@transitive_bs) or my co-founder, [Scott Silvi](https://twitter.com/scottsilvi), on twitter. Alternatively, [open a discussion](https://github.com/transitive-bullshit/eslint-plus-plus/discussions) on this repo if you're looking for help.

For commercial projects, we've partnered with [Duality](https://teamduality.dev/) to offer AI consulting services and expertise related to GPTLint. Reach out to our team [here](mailto:gptlint@teamduality.dev), and be sure to include some background info on your project and what you're looking for.

## Roadmap

### MVP Public Release

- linter engine
  - **improve evals**
    - [add unit tests to evals for edge cases](https://hamel.dev/blog/posts/evals/#step-2-create-test-cases)
      - will test the internal model outputs in addition to the top-level linting outputs
    - track eval results across multiple llm configs during CI
  - gracefully respect [rate limits](https://platform.openai.com/account/limits)
  - add support for [openai seed](https://platform.openai.com/docs/api-reference/chat/create#chat-create-seed) and `system_fingerprint` to help make the system more deterministic
  - handle context overflow properly depending on selected model
  - experiment with ways of making the number of LLM calls sublinear w.r.t. the number of files
    - experiment with using bin packing to optimize context usage, but that's still same `O(tokens)`
  - double-check against [openai best practices](https://platform.openai.com/docs/guides/prompt-engineering)
    - experiment with clearer delimiters in prompts vs markdown h1s
  - **improve error reporting to include approx line numbers**
- rule file format
  - relax the examples parsing and lean into more flexible markdown support
  - support both positive and negative examples in the same code block
  - `prefer-page-queries.md` code examples give extra context outside of the code blocks that we'd rather not miss
- rules
  - rewrite `liberal-accept-strict-produce` to be less verbose and have better examples
- config
  - support rule overrides for specific file globs like eslint
  - add ability to customize rule behavior with configs like eslint
  - **add ability to extend other configs**
  - **add built-in configs**
    - need better rules
    - convert this repo to a monorepo?
- cli
  - cache precheck tasks
- project
  - update project name in multiple places once we decide on a name
  - decide on an OSS license
  - add a [security policy](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository) ([example](https://github.com/Portkey-AI/gateway/blob/main/SECURITY.md))
  - add docs on config settings and how config resolution works
  - add built-in rules to readme
  - basic eval graphs and blog post
  - demo video
  - publish to NPM
  - public launch! 🚀

### Post-MVP

- cross-file linting (likely using [tree-sitter](https://tree-sitter.github.io/tree-sitter/))
- add support for different programming languages
- add support for applying autofixes to linter errors
- track the positive instances where we see rule conformance as well?
  - could help us output a better picture of overall code health
- fine-tuning pipeline for base linting task
- fine-tuning pipeline for individual rules
- explore reinforcement learning with continuous fine-tuning so rule accuracy improves over time
- explore generating rule definitions from an existing repo (PRs, unique code patterns, etc)

## Citations

```bibtex
@software{agentic2024gptlint,
  title  = {GPTLint},
  author = {Travis Fischer, Scott Silvi},
  year   = {2024},
  month  = {4},
  url    = {https://github.com/GPTLint/GPTLint}
}
```

## License

MIT © [Travis Fischer](https://twitter.com/transitive_bs)

To stay up to date or learn more, follow [@transitive_bs](https://twitter.com/transitive_bs) on Twitter.
