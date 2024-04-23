# Contributing

Suggestions and pull requests are very welcome. 😊

## Prerequisites

- `Node.js >= 18`
- `pnpm >= 8`
- `OPENAI_API_KEY` exported from `.env`

## Development

```sh
git clone https://github.com/gptlint/gptlint.git
cd gptlint
pnpm i
```

I recommend using [tsx](https://github.com/privatenumber/tsx) or a similar TS executable to run the linter locally. The examples in this doc will assume you have `tsx` installed globally.

You can run the linter via:

```sh
tsx bin/gptlint.ts --dry-run
```

## Testing

You can run the test suite via:

```sh
pnpm test
```

Or just the [Vitest](https://vitest.dev) unit tests via:

```sh
pnpm test:unit
```

Note that this test suite does not run any of the evals.

## Evals

You can run evals for the built-in rules via:

```sh
tsx bin/run-evals.ts
```

Or only targeting a single rule:

```sh
tsx bin/run-evals.ts -r rules/use-correct-english.md
```

Or only targeting a single eval file:

```sh
tsx bin/run-evals.ts -r rules/use-correct-english.md fixtures/evals/use-correct-english/1aaa98bb.ts
```

If you add or change a built-in rule, you can use an LLM to generate synthetic evals targeting that rule via

```sh
tsx bin/generate-evals.ts -r rules/new-example-rule.md
```

I highly recommend manually curating your synthetic evals to verify that your rule is working as intended. If the generated evals are poor, that's a good sign that your rule may perform poorly in terms of false positives / false negatives on real codebases.

Evals are an important topic with a lot of depth, and `gptlint` is currently just scratching the surface on this front. For a great overview on evals, [check out this blog post](https://hamel.dev/blog/posts/evals/).

## Debugging Rules

Whenever you find that a rule is not performing as expected, it will generally fall into one of two categories: false positives or false negatives.

- **false positives** occur when a rule violation is reported that shouldn't have been.
- **false negatives** occur when a rule violation should've been reported but wasn't.

These will generally happen because of the following reasons:

- The rule definition is too vague or strict.
  - **Solution**: Use prompt engineering and few-shot examples in your rule to guide the underlying LLM.
- The rule identifies violations some issues but misses others.
  - **Solution**: In addition to prompt engineering the rule itself, consider using a [gritql](https://github.com/getgrit/gritql) pattern to focus the rule on just the parts of your source files which are relvant.
- The rule makes more sense as an AST-based rule.
  - If it's possible to represent your rule using a deterministic, AST-based linter like `eslint`, and you're not seeing the consistency in enforcing the rule using `gptlint`, then consider using an `eslint` custom rule.
  - Tools like `eslint` have massive communities, so be sure to check NPM / github before building new rules from scratch.
  - If you still think your rule would be a better fit for `gptlint`, then feel free to open an issue in the repo to discuss.
- The rule still isn't performing well enough in practice.
  - There are any number of potential solutions, including improving `gptlint`'s core linter engine and/or fine-tuning.
  - **Solution**: [Reach out to us for support](https://gptlint.dev/project/support).

**NOTE**: If you're trying to get a rule working consistently, double check that it fits the [rule guidelines](https://gptlint.dev/extend/rule-guidelines) before spending too much time iterating on it.

## Docs

The docs folder is a normal [Next.js](https://nextjs.org) pages app built using [Nextra](https://nextra.site) and deployed to [Vercel](https://vercel.com).

You can run the docs dev server to preview your changes:

```sh
cd docs
pnpm dev
```
