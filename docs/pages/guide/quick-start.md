# Quick Start

## Install

> [!CAUTION]
> This tool isn't published to `npm` yet, so use `tsx bin/gptlint.ts` instead of the following usage examples. This requires you to checkout the code locally and install deps with `pnpm i`.

```sh
npm install -D gptlint
```

We recommended installing `gptlint` as a dev dependency just like `eslint`.

## OpenAI

GPTLint defaults to using the OpenAI API, so you'll need to sign up for an [OpenAI API key](https://platform.openai.com/docs/quickstart?context=node). Add your `OPENAI_API_KEY` as an environment variable or store it in a `.env` file in your project's root.

**GPTLint supports all LLM providers** including **local LLMs**, so if you don't want to use OpenAI, [see here](./llm-providers.md).

## Usage

```sh
npx gptlint --help
```

By default, `gptlint` uses `**/*.{js,ts,jsx,tsx,cjs,mjs}` to match source files and `.gptlint/**/*.md` to match any project-specific rule definition files you may want to add.

`gptlint` respects `.gitignore` and optionally `.gptlintignore` as well if it exists.

**TODO**

**TODO**: add `--dry-run` example and then walk through running it for real.

**TODO**
