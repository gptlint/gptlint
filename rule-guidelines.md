# GPTLint Rule Guidelines <!-- omit from toc -->

- [Intro](#intro)
- [Rule Rubric](#rule-rubric)
  - [Prefer AST-based rules where possible](#prefer-ast-based-rules-where-possible)
  - [Prefer universal rules](#prefer-universal-rules)
  - [Prefer rules that are well-defined](#prefer-rules-that-are-well-defined)
- [MVP Rule Limitations](#mvp-rule-limitations)
- [Library-specific rule configs](#library-specific-rule-configs)
- [Project-specific rules](#project-specific-rules)
- [Defense in depth](#defense-in-depth)
- [Example Rules](#example-rules)

## Intro

GPTLint is intended to augment traditional, AST-based, static analysis tools like `eslint`, `pylint`, `ruff`, etc with _higher-level codbest practices_ that are difficult or impossible to capture with these lower-level, AST-based tools. GPTLint rules are therefore meant to be higher-level in nature than traditional AST-based linting rules.

_On the flip side, rules which are too abstract are impossible to enforce_ – even for expert human developers.

**Ideal GPTLint rules are therefore higher-level best practices which are still concrete enough to be described, understood, and enforced by an expert human developer.**

## Rule Rubric

### Prefer AST-based rules where possible

For JS/TS devs, if one or more [eslint rules](https://eslint.org/docs/latest/rules/) is available which captures part or all of your rule's intent, then you should enable those `eslint` rules for your project.

For Python devs, comparable [pylint rules](https://pylint.pycqa.org/en/latest/user_guide/checkers/features.html) or [ruff rules](https://docs.astral.sh/ruff/rules/) should be preferred over GPTLint rules.

These OSS linters have vibrant ecosystems of community-driven, AST-based linting rules. Compared to GPTLint, they are **deterministic, relatively standard, and free**.

If you have a best practice you'd like to capture with GPTLint, first ask yourself:

- Does this best practice already have one or more existing AST-based rules that you can use instead?
- Is it possible to capture the rule's intent with an AST-based approach?
  - If it is, then this is a good sign that you should try to enforce your rule with an AST-based approach like [eslint's custom rules](https://eslint.org/docs/latest/extend/custom-rules).
  - However, just because it's theoretically possible to use an AST-based approach to capture a rule doesn't mean that you should always do so. Sometimes, the complexity of implementing non-trivial AST-based rules is so difficult and/or error-prone that you may be better off using a more flexible GPTLint rule instead.
  - The tradeoff here is _determinism and cost versus expressiveness_.

### Prefer universal rules

Rules which are aimed at best practices for a specific library (next.js, express, mongoose, etc) could be very good fits for either [project-specific rules](#project-specific-rules) or [community-driven, library-specific configs](#library-specific-rule-configs).

_TODO_

### Prefer rules that are well-defined

_TODO_

## MVP Rule Limitations

These guidelines all apply to ideal GPTLint rules. This project is still early, however, and the current MVP has the following additional, practical limitations:

- **Rules in the MVP are single-file only**
- **Rules in the MVP focus on the JS/TS ecosystem only**

Note that we expect to lift these restrictions in future major versions of GPTLint.

## Library-specific rule configs

Rules which are aimed at best practices for a specific library (next.js, express, mongoose, etc) will not be added to the core GPTLint ruleset and are instead a perfect fit for **community-driven, library-specific configs**.

The MVP doesn't contain any library-specific configs _yet_. If you'd like to work on a library-specific config, [create a discussion for it](https://github.com/transitive-bullshit/eslint-plus-plus/discussions/new?category=ideas) and include as much info on the library and proposed rules. You don't need any permission from us to create a library-specific config, but it may be helpful to receive feedback on your gameplan and to deduplicate similar efforts across the ecosystem.

## Project-specific rules

If a rule isn't generally applicable enough to be added to the default GPTLint rulesets, but you still want to enforce it across your codebase, then it may be a good fit for a project-specific rule.

Creating project-specific rules is very simple. Just create a markdown file for your rule in your project (or copy one of the default rule definitions from GPTLint). By convention, we recommend placing custom rules under a top-level `rules/` directory. You can enable your custom rule by adding it to the `rules` glob either via a `gptlint.config.js` file or via the CLI `--rules` option.

```js
import 'dotenv/config'

export default [
  {
    // Make sure your rule file is included in this field
    ruleFiles: ['rules/**/*.md']
  }
]
```

You can debug the fully resolved rules and config by running `gptlint --debug-config` to ensure that your custom rules are recognized correctly – without actually running the linter.

## Defense in depth

TODO

## Example Rules

TODO
