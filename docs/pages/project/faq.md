# FAQ

### How does GPTLint compare to ESLint?

GPTLint is not intended to replace AST-based linting tools like [eslint](https://eslint.org) (or [biome](https://biomejs.dev/linter/), [ruff](https://docs.astral.sh/ruff/), etc).

_We absolutely love `eslint`_ and strongly recommend that you use an AST-based linter in all of your projects.

**The power of GPTLint comes in enforcing higher-level rules that are difficult or impossible to capture with AST-based linters like `eslint`**. GPTLint is therefore _intended to augment AST-based linters_ like `eslint` to catch potential issues and enforce project-specific standards as early as possible without having to rely solely on PRs from human reviewers.

| AST-based linting (`eslint`) | LLM-based linting (`gptlint`)                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| deterministic                | mostly deterministic                                                                   |
| fast                         | slow                                                                                   |
| low-level                    | low-level or high-level                                                                |
| mature tooling & standards   | nascent tooling & standards                                                            |
| free                         | [expensive](./cost.md) or [cheap using local LLMs](./guide/llm-providers#local-models) |
| low-impact                   | **high-impact**                                                                        |

So what does a higher-level linting rule look like, and when should you use an AST-based linting rule versus an LLM-based linting rule? We answer this in-depth in our [rule guidelines](../extend/rule-guidelines.mdx), but the short answer is that we recommend using deterministic, AST-based linting wherever possible and augmenting this with LLM-based linting and code reviews to provide a _defense-in-depth approach to code quality_. LLM-based linting helps to minimize the need for human code reviews, but we believe they are fundamentally complementary as opposed to replacing replacing human code reviews entirely.

### How accurate / reliable is gptlint?

See [accuracy](./accuracy).

### How much will it cost to run gptlint on my codebase?

See [cost](./cost).

### How can I use GPTLint with a custom, local model?

See [local models](../guide/llm-providers.md#local-models).

### How can I use GPTLint with a different LLM provider?

See [LLM providers](../guide/llm-providers.md).

### How can I disable a rule?

You can disable a rule for a project by adding a config file at the root:

```js filename="gptlint.config.js"
import { recommendedConfig } from 'gptlint'

export default [
  ...recommendedConfig,
  {
    rules: {
      'prefer-fetch-over-axios': 'off'
    }
  }
]
```

### How can I disable a rule for a specific file?

Rules can be configured at the file-level using inline comments:

```ts
/* gptlint semantic-variable-names: off */
```

Separate multiple inline configs with commas:

```ts
/* gptlint use-esm: off, consistent-identifier-casing: warn */
```

Or use multiple inline comments:

```ts
/* gptlint use-esm: off */
/* gptlint consistent-identifier-casing: warn */
```

### How can I disable linting for a specific file?

Linting can be disabled at the file-level using an inline comment:

```ts
/* gptlint-disable */
```

### How can I customize a built-in rule?

Since rules are just markdown files, copy the rule's markdown file from [rules/](https://github.com/gptlint/gptlint/tree/main/rules) into your project and customize it to suit your project's needs.

You'll want to [disable the original rule](#how-can-i-disable-a-rule) and change your custom rule's name to a project-specific name. Make sure your local config includes your custom rule's markdown file in its `ruleFiles` field.

If your change is generally applicable to other projects, consider opening a pull request to GPTLint.

For more guidance around creating and evaluating custom rules that will work well across large codebases as well as expertise on fine-tuning models for use with custom rules, please [reach out to our consulting partners](mailto:gptlint@teamduality.dev).

### Are there file size limits?

The following source files will automatically be excluded:

- files matching `.gitignore`
- files matching an optional `.gptlintignore`
- binary files
- empty files
- large files over 200kb
- files with over 10k lines
- lines with over 1024 characters will be truncated
- files with more than one line over 1024 characters
- known generated files (`package-lock.json`, etc)

These filters are similar to [github code search's limits](https://docs.github.com/en/search-github/github-code-search/about-github-code-search#limitations).

### What limitations does GPTLint have?

See [limitations](./limitations.md), [cost](./cost), and [accuracy](./accuracy).

### How does privacy work with GPTLint?

GPTLint is a free, open source project which you can run on any codebase.

The only external service GPTLint relies on is an [LLM provider](../guide/llm-providers.md), which defaults to [OpenAI](https://openai.com/enterprise-privacy). [OpenAI's enterprise privacy](https://openai.com/enterprise-privacy) is to never store, log, or train your code, and their API is fully SOC 2 compliant.

If you need stronger privacy & security guarantees, GPTLint supports using any [LLM provider](../guide/llm-providers.md), including [local models](../guide/llm-providers.md#local-models) which can be self-hosted to guarantee that no data is ever transmitted to any external services.

### What about fine-tuning?

See our notes on [fine-tuning in how it works](./how-it-works.md#fine-tuning).

### Where can I get support?

For free, open source projects, feel free to DM me [@transitive_bs](https://twitter.com/transitive_bs) or my co-founder, [Scott Silvi](https://twitter.com/scottsilvi), on twitter. Alternatively, [open a discussion](https://github.com/gptlint/gptlint/discussions) on this repo if you're looking for help.

For commercial projects, we've partnered with [Duality](https://teamduality.dev) to offer AI consulting services and expertise related to GPTLint. Reach out to our team [here](mailto:gptlint@teamduality.dev), and be sure to include some background info on your project and what you're looking for.

We are working with several fortune 500 companies as design partners to explore what a productized offering built on top of the GPTLint OSS core might look like. If you're interested in an enterprise arrangement, please [reach out](mailto:gptlint@teamduality.dev).
