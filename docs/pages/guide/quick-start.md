# Quick Start

## Install

> [!CAUTION]
> This tool isn't published to `npm` yet, so use `tsx bin/gptlint.ts` instead of the following usage examples. This requires you to checkout the code locally and install deps with `pnpm i`.

```sh npm2yarn
npm i -D gptlint
```

We recommended installing `gptlint` as a dev dependency just like `eslint`.

## OpenAI

GPTLint defaults to using the OpenAI API, so you'll need to sign up for an [OpenAI API key](https://platform.openai.com/docs/quickstart?context=node). Add your `OPENAI_API_KEY` as an environment variable or store it in a `.env` file in your project's root.

**GPTLint supports all LLM providers** including **local LLMs**, so if you don't want to use OpenAI, [see here](./llm-providers.md).

## Dry Run

```sh
npx gptlint --help
```

By default, `gptlint` uses `**/*.{js,ts,jsx,tsx,cjs,mjs}` to match source files and `.gptlint/**/*.md` to match any project-specific rule definition files you may want to add.

`gptlint` respects `.gitignore` and optionally `.gptlintignore` as well if it exists.

Now let's try running `gptlint` with the `--dry-run` flag:

```sh
npx gptlint --dry-run
```

**This command will always be free.**

The `--dry-run` causes `gptlint` to mock out any LLM API calls and instead output an estimate of how much it would cost to run the linter for real.

Since [LLM costs can add up quickly for large codebases](../project/cost.md), it's always a good idea to understand the projected costs before running `gptlint`.

If you just want to try out `gptlint` without worrying about costs, we recommend running `gptlint` on a single source file or subdirectory. For example:

```sh
npx gptlint --dry-run src/utils.ts
```

## Real Run

TODO
