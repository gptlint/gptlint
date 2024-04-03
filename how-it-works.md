<p align="center">
  <img alt="Single-Pass Linting" src="/media/how-gptlint-works.png">
</p>

# How GPTLint Works <!-- omit from toc -->

- [Overview](#overview)
- [Single-Pass Linting](#single-pass-linting)
- [Two-Pass Linting](#two-pass-linting)
  - [Advantages of Two-Pass Linting](#advantages-of-two-pass-linting)
  - [Disadvantages of Two-Pass Linting](#disadvantages-of-two-pass-linting)
- [LLM Output Format](#llm-output-format)
  - [RuleViolation Schema](#ruleviolation-schema)
- [Evals](#evals)
- [Fine-Tuning](#fine-tuning)
- [More Info](#more-info)
- [License](#license)

## Overview

To lint a codebase, GPTLint takes the following steps:

1. Resolves a set of markdown rule definitions along with optional few-shot examples for each rule (defaults to `rules/**/*.md`)
2. Resolves a set of input source files to lint (defaults to `**/*.{js,ts,jsx,tsx,cjs,mjs}`)
3. For each `[rule, file]` pair, creates a **linter task**
4. Filters any linter tasks which are cached from previous runs based on the contents of the rule and file
5. For each non-cached linter task, runs it through an LLM classifier pipeline which the goal of identifying rule violations

All of the magic happens in step 5, and GPTLint supports two approaches for this core linting logic: [single-pass linting](#single-pass-linting) and [two-pass linting](#two-pass-linting), both of which have their own pros & cons.

The core linting logic lives in [src/lint-file.ts](./src/lint-file.ts).

## Single-Pass Linting

<p align="center">
  <img alt="Single-Pass Linting" src="/media/single-pass-linting.png">
</p>

In single-pass linting, a single LLM inference call is used to both evaluate a lint task (rule x file pair) as well as to act as a classifier in identifying rule violations.

In this approach, every lint task goes takes the following steps:

1. Passes the rule and file to an LLM with the task of identifying rule violations
2. Parses the LLM's markdown output for a JSON code block containing an array of `RuleViolation` objects
3. Retries step #1 if the LLM's structured output fails to validate
4. Otherwise, adds any valid `RuleViolation` objects to the output

## Two-Pass Linting

<p align="center">
  <img alt="Two-Pass Linting" src="/media/single-pass-linting.png">
</p>

Everything starts off the same in two-pass linting as single-pass linting.

We replace our single LLM with two models: a weaker, cheaper model (`weakModel` in the gptlint config) and a stronger, more expensive model (`model` in the gptlint config).

In the first pass, the weak model is used to generate a set of potential `RuleViolation` candidates. In the second pass, we give these rule violation candidates to the stronger model which acts as a discriminator for filtering false positives from the candidates.

This strategy is significantly **faster, cheaper, and more accurate** than single-pass linting, and is currently the default strategy used by GPTLint.

### Advantages of Two-Pass Linting

- **overall false positive rate is significantly smaller** ([example](https://github.com/transitive-bullshit/eslint-plus-plus/pull/4#issuecomment-2033395717))
- since the faster, cheaper, weak model is used for 95% of the work, **the linter is roughly an order of magnitude faster and cheaper** ([example](https://github.com/transitive-bullshit/eslint-plus-plus/pull/4#issuecomment-2033395717))

### Disadvantages of Two-Pass Linting

- increases the chance for false negatives
  - currently, I'm a lot more worried about mitigating false positives because a noisy linter that you end up ignoring isn't useful to anybody, and I haven't seen too many false negatives with the current rule/file-based classifier approach
  - if you're worried about false negatives, you can use two-pass linting with the same model for both `weakModel` and the strong `model`
- makes the implementation slightly more complex

## LLM Output Format

In both approaches, the first LLM pass outputs a markdown file with two sections, `EXPLANATION` and `VIOLATIONS`. In the single-pass approach, this is parsed as the final output. In the two-pass approach, the parsed results are used as the candidate rule violations for the second pass.

The `EXPLANATION` section is important to give the LLM [time to think](https://twitter.com/karpathy/status/1708142056735228229). A previous version without this section produced false positives much more frequently.

The `VIOLATIONS` section contains the actual structured JSON output of [RuleViolation](./src/rule-violations.ts) objects.

<details>
<summary>
**Example LLM markdown output**:
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

This [`RuleViolation` schema](./src/rule-violations.ts) has gone through many iterations, and it's worth taking a look at the descriptions of each field that are passed to the model as context.

In particular, `codeSnippetSource`, `reasoning`, `violation`, and `confidence` were all added empirically to increase the LLM's accuracy and to mitigate common issues. Even with these fields, false positives are still possible, but forcing the model to fill out these additional fields has proven very effective at increasing the linter's accuracy.

## Evals

- [`bin/generate-evals.ts`](./bin/generate-evals.ts) is used to generate N synthetic positive and negative example code snippets for each rule under [`fixtures/evals`](./fixtures/evals)
- [`bin/run-evals.ts`](./bin/run-evals.ts) is used to evaluate rules for false negatives / false positives across their generated test fixtures

You can think of these evals as integration tests for ensuring that the entire linting pipeline works as intended for all of the built-in rules.

## Fine-Tuning

To improve the cost, speed, accuracy, and robustness of GPTLint, a natural next step would be to fine-tune models specific to this linting task and/or create fine-tuned models for each of the built-in rules.

We've made the explicit decision not to do this for a few main reasons:

1. One of our goals with GPTLint is totry and make the project as generally useful as an open source standard as possible. By working with off-the-shelf foundation models and not relying on any specific fine-tuned , we improve the accessibility of the project.

2. We were curious how far we could get on this task with general purpose LLMs, and it's been a great learning experience so far.

3. KISS 💪

4. Fine-tuning seems like a natural place to separate the OSS GPTLint project from any future product offerings built on top of the GPTLint core.

## More Info

For more info on how to get the most out of GPTLint, including expertise creating custom rules or fine-tunes that will work well with your codebase, feel free to [reach out to our consulting partners](gptlint@teamduality.dev).

## License

MIT © [Travis Fischer](https://twitter.com/transitive_bs)

To stay up to date or learn more, follow [@transitive_bs](https://twitter.com/transitive_bs) on Twitter.
