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
- [How it works](#how-it-works)
- [Install](#install)
- [Usage](#usage)
- [CLI](#cli)
- [LLM Providers](#llm-providers)
  - [OpenAI](#openai)
  - [Anthropic](#anthropic)
  - [OSS Models](#oss-models)
  - [Local Models](#local-models)
- [Caveats](#caveats)
- [FAQ](#faq)
  - [How can I disable a rule?](#how-can-i-disable-a-rule)
  - [How can I disable a rule for a specific file?](#how-can-i-disable-a-rule-for-a-specific-file)
  - [How can I disable linting for a specific file?](#how-can-i-disable-linting-for-a-specific-file)
  - [How can I customize a built-in rule?](#how-can-i-customize-a-built-in-rule)
  - [Why aren't you using fine-tuning?](#why-arent-you-using-fine-tuning)
  - [Where can I get help integrating GPTLint into my codebase?](#where-can-i-get-help-integrating-gptlint-into-my-codebase)
- [Roadmap](#roadmap)
  - [MVP Public Release](#mvp-public-release)
  - [Post-MVP](#post-mvp)
- [Citations](#citations)
- [License](#license)

## Features

- ✅️ _enforce higher-level best practices that are impossible with ast-based approaches_
- ✅️ simple markdown format for rules ([example](./rules/prefer-array-at-negative-indexing.md), [spec](./rule-spec.md))
- ✅️ easy to [disable](#how-can-i-disable-a-rule) or [customize](#how-can-i-customize-a-rule) rules
- ✅️ add custom, [project-specific rules](./rule-guidelines.md#project-specific-rules)
- ✅️ same cli and config format as `eslint`
- ✅️ supports `gptlint.config.js` and inline overrides `/* gptlint-disable */`
- ✅️ content-based caching
- ✅️ outputs LLM stats per run (cost, tokens, etc)
- ✅️ built-in rules are extensively tested w/ [evals](#evals)
- ✅️ supports all major [LLM providers](#llm-providers)
- ✅️ supports all major [local LLMs](#local-models)
- ✅️ augments `eslint` instead of trying to replace it (_we love eslint!_)
- ✅️ includes [guidelines](./rule-guidelines.md) for creating your own rules
- ❌ MVP rules are [JS/TS only](#caveats) _for now_
- ❌ MVP rules are [single-file context only](#caveats) _for now_

## How it works

<p align="center">
  <img alt="How it works" src="/media/how-gptlint-works.png">
</p>

See our [docs on how it works](./how-it-works.md) for more details.

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

The default model is `gpt-4`. We're not using `gpt-4-turbo-preview` as the default because some developers don't have access to it. The default `weakModel` is `gpt-3.5-turbo` which is used for [two-pass linting](./how-it-works.md#two-pass-linting).

If you have access to `gpt-4-turbo-preview`, it is recommended to use over `gpt-4` by adding a [config file](./gptlint.config.js) to your project.

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

### OSS Models

The best way to use GPTLint with OSS models is to either [host them locally](#local-models) or to use a cloud provider that offers inference and fine-tuning APIs for common OSS language models:

- [Together.ai](https://www.together.ai)
- [Anyscale](https://www.anyscale.com/private-endpoints)
- [Modal Labs](https://modal.com/use-cases/language-models)

### Local Models

- [ollama](https://github.com/ollama/ollama) supports exposing a local [OpenAI compatible server](https://github.com/ollama/ollama/blob/main/docs/openai.md)
- [vLLM](https://github.com/vllm-project/vllm) supports exposing a local [OpenAI compatible server](https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html)

Use the `apiBaseUrl` and `apiKey` config / CLI params to point GPTLint to your local model server.

## Caveats

- this tool passes an LLM portions of your code and the rule definitions alongside few-shot examples, so depending on the LLM's settings and the quality of your rules, it's possible for the tool to produce **false positives** (hallucinated errors which shouldn't have been reported) and/or **false negatives** (real errors that the tool missed)
  - **all built-in rules are extensively tested** with evals to ensure that the linter is as accurate as possible by default
  - keep in mind that even expert human developers are unlikely to reach perfect accuracy when reviewing large codebases (we all miss things, get tired, get distracted, etc), **so the goal of this project is not to achieve 100% accuracy, but rather to surpass human expert-level accuracy on this narrow task at a fraction of the cost and speed**
- **LLM costs can add up quickly**
  - [two-pass linting](./how-it-works.md#two-pass-linting) helps significantly with costs by using a cheaper, weaker model for 95% of the work, but if you're running the linter on very large codebases, LLM costs can still add up quickly
  - NOTE: this variable cost goes away when using a local LLM, where you're paying directly for GPU compute instead of paying per token
  - NOTE: for many projects, this will still be _orders of magnitude cheaper_ than hiring a senior engineer to track and fix technical debt
- **rules in the MVP are single-file only**
  - many architectural rules span multiple files, but we wanted to keep the MVP scoped, so we made the decision to restrict rules to the context of a single file _for now_
  - this restriction will likely be removed once we've validated the initial version with the community, but it will likely remain as an optional rule setting to optimize rules which explicitly don't need multi-file context
  - if you'd like to use a rule which requires multi-file analysis, [please open an issue to discuss](https://github.com/transitive-bullshit/eslint-plus-plus/issues/new)
- **rules in the MVP focus on JS/TS only**
  - this project is inherently language-agnostic, but to keep the MVP scoped, I wanted to focus on the languages & ecosystem that I'm most familiar with
  - we're hoping that rules for other programming languages will trickle in with help from the community over time

## FAQ

### How can I disable a rule?

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

### How can I disable a rule for a specific file?

Rules can be configured at the file-level using inline rule config comments:

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

### How can I disable linting for a specific file?

Linting can be disabled at the file-level using an inline config comment:

```ts
/* gptlint-disable */
```

### How can I customize a built-in rule?

Since rules are just markdown files, copy the rule's markdown file from [rules/](./rules) into your project and customize it to suit your project's needs.

You'll want to [disable the original rule](#how-can-i-disable-a-rule) and change your custom rule's name to a project-specific name. Make sure your local config includes your custom rule's markdown file in its `ruleFiles` field.

If your change is generally applicable to other projects, consider opening a pull request to GPTLint.

For more guidance around creating and evaluating custom rules that will work well across large codebases as well as expertise on fine-tuning models for use with custom rules, please [reach out to our consulting partners](mailto:gptlint@teamduality.dev).

### Why aren't you using fine-tuning?

See our notes on [fine-tuning in how it works](./how-it-works.md#fine-tuning).

### Where can I get help integrating GPTLint into my codebase?

For free, open source projects, feel free to DM me [@transitive_bs](@transitive_bs) or my co-founder, [Scott Silvi](https://twitter.com/scottsilvi), on twitter. Alternatively, [open a discussion](https://github.com/transitive-bullshit/eslint-plus-plus/discussions) on this repo if you're looking for help.

For commercial projects, we've partnered with [Duality](https://teamduality.dev/) to offer AI consulting services and expertise related to GPTLint. Reach out to our team [here](mailto:gptlint@teamduality.dev), and be sure to include some info on your project and what you're looking for.

## Roadmap

### MVP Public Release

- linter engine
  - **improve evals**
  - gracefully respect [rate limits](https://platform.openai.com/account/limits)
  - add support for [openai seed](https://platform.openai.com/docs/api-reference/chat/create#chat-create-seed) and `system_fingerprint` to help make the system more deterministic
  - handle context overflow properly depending on selected model
  - experiment with ways of making the number of LLM calls sublinear w.r.t. the number of files
    - possibly using bin packing to optimize context usage, but that's still same `O(tokens)`
- rule file format
  - support both positive and negative examples in the same code block
  - `prefer-page-queries.md` code examples give extra context outside of the code blocks that we'd rather not miss
  - support additional h2s (ex for caveats / exceptions / usage examples)
- config
  - **add ability to extend other configs**
  - **add built-in configs**
    - need better rules
    - convert this repo to a monorepo?
- cli
  - improve progress bar; possibly switch to [cli-progress](https://github.com/npkgz/cli-progress)
  - **output how long linting took in stats**
  - cache precheck tasks
- project
  - update project name in multiple places once we decide on a name
  - decide on an OSS license
  - add a [security policy](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository) ([example](https://github.com/Portkey-AI/gateway/blob/main/SECURITY.md))
  - basic eval graphs and blog post
  - publish to NPM
  - public launch! 🚀

### Post-MVP

- cross-file linting
- add support for different programming languages
- add support for applying fixes to linter errors
- track the positive instances where we see rule conformance as well?
  - could help us output a better picture of overall code health
- fine-tuning pipeline both for base linting task
- fine-tuning pipeline both for individual rules
- explore reinforcement learning with continuous fine-tuning so rule accuracy improves over time

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
