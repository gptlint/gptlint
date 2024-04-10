# How It Works <!-- omit from toc -->

- [Overview](#overview)
- [Single-Pass Linting](#single-pass-linting)
- [Two-Pass Linting](#two-pass-linting)
- [Single-Pass vs Two-Pass Linting](#single-pass-vs-two-pass-linting)
- [LLM Output Format](#llm-output-format)
  - [RuleViolation Schema](#ruleviolation-schema)
- [Evals](#evals)
- [Fine-Tuning](#fine-tuning)
- [More Info](#more-info)

## Overview

<p align="center">
  <img alt="Single-Pass Linting" src="/how-gptlint-works.png">
</p>

To lint a codebase, GPTLint takes the following steps:

1. Resolves a set of markdown rule definitions along with optional few-shot examples for each rule (defaults to `.gptlint/**/*.md`)
2. Resolves a set of input source files to lint (defaults to `**/*.{js,ts,jsx,tsx,cjs,mjs}`)
3. For each `[rule, file]` pair, creates a **linter task**
4. Filters any linter tasks which are cached from previous runs based on the contents of the rule and file
5. For each non-cached linter task, runs it through an LLM classifier pipeline which the goal of identifying rule violations

All of the magic happens in step 5, and GPTLint supports two approaches for this core linting logic: [single-pass linting](#single-pass-linting) and [two-pass linting](#two-pass-linting), both of which have their own pros & cons.

The core linting logic lives in [src/lint-file.ts](https://github.com/gptlint/gptlint/tree/main/src/lint-file.ts).

## Single-Pass Linting

<p align="center">
  <img alt="Single-Pass Linting" src="/single-pass-linting.png">
</p>

In single-pass linting, a single LLM inference call is used to both evaluate a lint task (rule x file pair) as well as to act as a classifier in identifying potential rule violations.

In this approach, every lint task goes through the following steps:

1. Passes the rule and file to an LLM with the task of identifying rule violations
2. Parses the LLM's markdown output for a JSON code block containing an array of `RuleViolation` objects
3. Retries step #1 if the LLM's structured output fails to validate
4. Otherwise, adds any valid `RuleViolation` objects to the output

## Two-Pass Linting

<p align="center">
  <img alt="Two-Pass Linting" src="/two-pass-linting.png">
</p>

Everything starts off the same in two-pass linting as single-pass linting.

We replace our single LLM with two models: a weaker, cheaper model (`weakModel` in the gptlint config) and a stronger, more expensive model (`model` in the gptlint config).

In the first pass, the weak model is used to generate a set of potential `RuleViolation` candidates. In the second pass, we give these rule violation candidates to the stronger model which acts as a discriminator for filtering out false positives.

## Single-Pass vs Two-Pass Linting

**Two-Pass linting is significantly faster, cheaper, and more accurate than single-pass linting**, and is currently the default strategy used by GPTLint.

Here is a [side-by-side comparison](https://github.com/gptlint/gptlint/pull/4#issuecomment-2033395717) of the two strategies using both OpenAI (`gpt-3.5-turbo` as the weak model and `gpt-4-turbo-preview` as the strong model) and Anthropic Claude (`haiku` as the weak model and `opus` as the strong model).

Note that one potential downside of two-pass linting is that it increases the chance for false negatives (cases where the linter should trigger an error but it doesn't). Currently, I'm a lot more worried about mitigating false positives because a noisy linter that you end up ignoring isn't useful to anybody, and I haven't seen too many false negatives in my testing.

If you're worried about false negatives, you can use always use two-pass linting with the same model for both `weakModel` and `model`.

## LLM Output Format

In both approaches, the first LLM pass outputs a markdown file with two sections, `EXPLANATION` and `VIOLATIONS`. In the single-pass approach, this is parsed as the final output. In the two-pass approach, the parsed results are used as the candidate rule violations for the second pass.

The `EXPLANATION` section is important to give the LLM [time to think](https://twitter.com/karpathy/status/1708142056735228229). A previous version without this section produced false positives much more frequently.

The `VIOLATIONS` section contains the actual structured JSON output of [RuleViolation](/src/rule-violations.ts) objects.

<details>
<summary>
<b>Example LLM markdown output:</b>
</summary>

```md
# EXPLANATION

The source code provided is a TypeScript file that includes variable names, function names, and type imports. According to the "consistent-identifier-casing" rule, variable names should use camelCase, global const variable names should use camelCase, PascalCase, or CONSTANT_CASE, type names should use PascalCase, class names should use PascalCase, and function names should use camelCase.

Upon reviewing the source code, the following observations were made:

1. Variable names such as `ast`, `h1RuleNodes`, `headingRuleNode`, `bodyRuleNodes`, and `rule` are all in camelCase, which conforms to the rule.
2. Function names like `parseRuleFile`, `findAllBetween`, `findAllHeadingNodes`, `parseMarkdownAST`, and `parseRuleNode` are in camelCase, which also conforms to the rule.
3. The type import `import type * as types from './types.js'` uses PascalCase for the type alias `types`, which is acceptable since it's an import statement and the rule primarily focuses on the casing of identifiers rather than import aliases.
4. The variable `example_rule_failure` uses snake_case, which violates the rule for consistent identifier casing for variable names.

Based on these observations, the only violation found in the source code is the use of snake_case in the variable name `example_rule_failure`.

# VIOLATIONS

\`\`\`json
[
{
"ruleName": "consistent-identifier-casing",
"codeSnippet": "let example_rule_failure",
"codeSnippetSource": "source",
"reasoning": "The variable name 'example_rule_failure' uses snake_case, which violates the rule that variable names should use camelCase.",
"violation": true,
"confidence": "high"
}
]
\`\`\`
```

</details>

### RuleViolation Schema

```ts
interface RuleViolation {
  ruleName: string
  codeSnippet: string
  codeSnippetSource: 'examples' | 'source' | 'unknown'
  reasoning: string
  violation: boolean
  confidence: 'low' | 'medium' | 'high'
}
```

This [`RuleViolation` schema](https://github.com/gptlint/gptlint/tree/main/src/rule-violations.ts) has gone through many iterations, and it's worth taking a look at the descriptions of each field that are passed to the model as context.

In particular, `codeSnippetSource`, `reasoning`, `violation`, and `confidence` were all added empirically to increase the LLM's accuracy and to mitigate common issues. Even with these fields, false positives are still possible, but forcing the model to fill out these additional fields has proven very effective at increasing the linter's accuracy.

## Evals

- [`bin/generate-evals.ts`](https://github.com/gptlint/gptlint/tree/main/bin/generate-evals.ts) is used to generate N synthetic positive and negative example code snippets for each rule under [`fixtures/evals`](https://github.com/gptlint/gptlint/tree/main/fixtures/evals)
- [`bin/run-evals.ts`](https://github.com/gptlint/gptlint/tree/main/bin/run-evals.ts) is used to evaluate rules for false negatives / false positives across their generated test fixtures

You can think of these evals as integration tests for ensuring that the entire linting pipeline works as intended for all of the built-in rules.

## Fine-Tuning

To improve the cost, speed, accuracy, and robustness of GPTLint, a natural next step would be to fine-tune models specific to this linting task and/or create fine-tuned models for each of the built-in rules.

We've made the explicit decision not to do this for a few main reasons:

1. One of our goals with GPTLint is to try and make the project as generally useful as an open source standard as possible. By working with off-the-shelf foundation models and not relying on any specific fine-tuning outputs, we improve the accessibility of the project's default settings.

2. We were curious how far we could get on this task with general purpose LLMs, and it's been a great learning experience so far.

3. KISS 💪

4. Fine-tuning seems like a natural place to separate the OSS GPTLint project from any future product offerings built on top of the GPTLint core.

## More Info

For more info on how to get the most out of GPTLint, including expertise creating custom rules or fine-tunes that will work well with your codebase, feel free to [reach out to our consulting partners](mailto:gptlint@teamduality.dev).
