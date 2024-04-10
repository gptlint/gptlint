# Usage

> [!CAUTION]
> This tool isn't published to `npm` yet, so use `tsx bin/gptlint.ts` instead of the following usage examples. This requires you to checkout the code locally and install deps with `pnpm i`.

```sh
echo "OPENAI_API_KEY='your openai api key'" >> .env
gptlint

# or

export OPENAI_API_KEY='your openai api key'
gptlint

# or

gptlint -k 'your openai api key'
```

By default, `gptlint` uses `**/*.{js,ts,jsx,tsx,cjs,mjs}` as a file glob for source files to lint and `rules/**/*.md` for rule definition files.

`gptlint` respects `.gitignore` and optionally `.gptlintignore` as well if it exists.
