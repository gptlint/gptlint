# GPTLint Rule Guidelines <!-- omit from toc -->

- [Intro](#intro)
- [Rule Rubric](#rule-rubric)
  - [Checklist](#checklist)
  - [Prefer AST-based rules where possible](#prefer-ast-based-rules-where-possible)
  - [Prefer rules that are well-defined](#prefer-rules-that-are-well-defined)
  - [Prefer universal rules](#prefer-universal-rules)
  - [Prefer direct, substantive rules](#prefer-direct-substantive-rules)
- [MVP Rule Limitations](#mvp-rule-limitations)
- [Library-specific rule configs](#library-specific-rule-configs)
- [Project-specific rules](#project-specific-rules)
- [Defense in depth](#defense-in-depth)
- [Example Rules](#example-rules)

## Intro

<p align="center">
  <img alt="GPTLint Rule Guidelines" src="/media/gptlint-rule-guidelines.png">
</p>

**GPTLint is intended to augment traditional, AST-based, static analysis tools** like `eslint`, `pylint`, `ruff`, etc with _higher-level coding best practices_ that are difficult or impossible to capture with these lower-level, AST-based tools. GPTLint rules are therefore meant to be higher-level in nature than AST-based linting rules.

On the flip side, _rules which are too abstract are impossible to enforce_ – both for expert human developers and for LLMs.

**Therefore, ideal GPTLint rules are higher-level best practices which are still concrete enough to be described, understood, and enforced by an expert human developer.**

## Rule Rubric

### Checklist

Before adding a best practice as a GPTLint rule, double-check the following litmus tests:

- [ ] This rule is high-level enough to not a good fit for AST-based linting ([Prefer AST-based rules where possible](#prefer-ast-based-rules-where-possible))
- [ ] This rule is concrete enough to be well-defined ([Prefer rules that are well-defined](#prefer-rules-that-are-well-defined))
- [ ] This rule is universal and does not target a specific library ([Prefer universal rules](#prefer-universal-rules))
- [ ] This rule is substantive enough that a senior engineer would comment on a violation in a PR ([Prefer direct, substantive rules](#prefer-direct-substantive-rules))
- [ ] This rule still makes sense given the current MVP limitations ([MVP rule limitations](#mvp-rule-limitations))
- [ ] This rule isn't already covered by an existing rule

### Prefer AST-based rules where possible

For JS/TS devs, if one or more [eslint rules](https://eslint.org/docs/latest/rules/) are available which capture part or all of your rule's intent, then you should enable those `eslint` rules for your project instead of adding a `gptlint` rule.

For Python devs, comparable [pylint rules](https://pylint.pycqa.org/en/latest/user_guide/checkers/features.html) or [ruff rules](https://docs.astral.sh/ruff/rules/) should be preferred over GPTLint rules.

These OSS linters have vibrant ecosystems of community-driven rules. **Compared to GPTLint, these AST-based linters are deterministic, extremely fast, relatively standard, and free**. On the other hand, **they are fundamentally restricted in the type of AST-level linting rules they can enforce**.

If you have a best practice you'd like to capture with GPTLint, first ask yourself:

- Does this best practice already have one or more existing AST-based rules that you can use instead?
- Is it possible to capture the rule's intent with an AST-based approach?
  - If it is, then this is a good sign that you should try to enforce your rule with an AST-based approach like [eslint's custom rules](https://eslint.org/docs/latest/extend/custom-rules).
  - However, just because it's theoretically possible to use an AST-based approach to capture a rule doesn't mean that you should always do so. Sometimes, the complexity of implementing non-trivial AST-based rules is so difficult and/or error-prone that you may be better off using a more flexible GPTLint rule instead.
  - The tradeoff here is _determinism and cost versus expressiveness_.

### Prefer rules that are well-defined

_TODO_

### Prefer universal rules

Rules which are aimed at best practices for a specific library (next.js, express, mongoose, etc) could be very good fits for either [project-specific rules](#project-specific-rules) or [community-driven, library-specific configs](#library-specific-rule-configs).

_TODO_

### Prefer direct, substantive rules

Rules which have a direct effect on program behavior, correctness, security, or performance OR developer velocity are preferred to rules which focus solely on code style.

Stylistic rules are still encouraged when they are sufficiently [universal](#prefer-universal-rules), or when their intent is aimed at **enforcing codebase consistency**. These rules are often targeted at uncovering code smells which may indirectly lead to decreased developer velocity or program correctness over time.

A good litmus test when considering a potential rule is to ask yourself the following:

- If the best senior engineer on your team were to review a PR containing several violations of your proposed rule, would these issues be substantive enough for them to comment on?
  - If your answer is **yes**, then that's a great sign that your rule should be added and enforced going forwards.
  - If your answer is **maybe**, then you should consider if the rule is worth enforcing.
  - If your answer is **no**, then you should reconsider whether or not this rule is substantive enough to be worth enforcing.
- Has this rule come up in previous PR comments from your project / organization?
  - If your answer is **yes**, then that's a great sign that your rule should be added and enforced going forwards.
  - If your answer is **maybe**, then you should consider if the rule is worth enforcing.
  - If your answer is **no**, then you should reconsider whether or not this rule is substantive enough to be worth enforcing.

## MVP Rule Limitations

These guidelines all apply to ideal GPTLint rules. This project is still early, however, and the current MVP has the following additional, practical limitations:

- **Rules in the MVP are single-file only**
- **Rules in the MVP focus on the JS/TS ecosystem only**

Note that we expect to lift these restrictions in future major versions of GPTLint.

## Library-specific rule configs

Rules which are aimed at best practices for a specific library (e.g., next.js, express, mongoose, fastapi, etc) will not be added to the core GPTLint ruleset and are instead a perfect fit to be bundled as **community-driven, library-specific configs**.

The MVP doesn't contain any library-specific configs _yet_. If you'd like to contribute a library-specific config, [create a discussion for it](https://github.com/gptlint/gptlint/discussions/new?category=ideas) and include as much info on the library and proposed rules. You don't need any permission from us to create a library-specific config, of course, but it may be helpful to receive feedback on your gameplan to deduplicate similar efforts across the community.

## Project-specific rules

If a rule isn't generally applicable enough to be added to the default GPTLint rulesets, but you still want to enforce it across your codebase, then it may be a good fit for a project-specific rule.

Creating project-specific rules is very simple. Just create a markdown file for the rule in your project (or copy one of the default rule definition files from GPTLint). By convention, we recommend placing custom rules under a top-level `rules/` directory. You can enable your custom rule by adding it to the `rules` glob either via a `gptlint.config.js` file or via the CLI `--rules` option.

```js
import 'dotenv/config'

export default [
  {
    // Make sure that your rule file is included in this config option
    ruleFiles: ['rules/**/*.md']
  }
]
```

You can debug the fully resolved rules and config options at any time by running `gptlint --print-config` to ensure that your custom rules are recognized correctly (this command logs the resolved config and then exits without actually running the linter).

## Defense in depth

_TODO_

## Example Rules

_TODO_
