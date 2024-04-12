# GPTLint Rule Informal Spec

<table>
<tr><td>Version</td><td>0.1.0</td></tr>
<tr><td>Last Updated</td><td>April 11, 2024</td></tr>
<tr><td>Author</td><td><a href="https://twitter.com/transitive_bs">Travis Fischer</a></td></tr>
</table>

## About

The GPTLint Rule Spec (abbreviated **GRS** in this doc) is an attempt to define a standard for how to describe higher-level lint rules that can be enforced across codebases using LLM-based tools compatible with [GPTLint](https://github.com/gptlint/gptlint).

## Example Rule

Here is an example markdown rule with `yaml` frontmatter:

```md
---
fixable: false
tags: [best practices]
languages: [javascript, typescript]
---

# Example Rule

Plain-text description of the rule's intent.

### Bad

optional example code blocks showing the rule being used incorrectly

### Good

optional example code blocks showing the rule being used correctly
```

This rule would canonically be stored in `.gptlint/example-rule.md` and have the name `example-rule`.

## Rule Format

GRS rules are parsed into the following TypeScript format:

```ts
export type Rule = {
  // core rule definition
  name: string
  message: string
  description?: string
  positiveExamples?: RuleExample[]
  negativeExamples?: RuleExample[]

  // optional, user-defined metadata
  fixable?: boolean
  languages?: string[]
  tags?: string[]
  eslint?: string[]
  include?: string[]
  exclude?: string[]
  resources?: string[]
  model?: string
  scope: LintRuleScope // defaults to 'file'
  level: LintRuleLevel // defaults to 'error'

  // optional custom functionality for rules scoped to the file-level
  preProcessFile?: PreProcessFileFn
  processFile?: ProcessFileFn
  postProcessFile?: PostProcessFileFn

  // optional custom functionality for rules scoped to the project-level
  preProcessProject?: PreProcessProjectFn
  processProject?: ProcessProjectFn
  postProcessProject?: PostProcessProjectFn
}

export type LintRuleScope = 'file' | 'project' | 'repo'
export type LintRuleLevel = 'error' | 'warn' | 'off'
```

See the [full types](https://github.com/gptlint/gptlint/blob/main/src/rule.ts) for more details.

### Rule File Format

A GRS rule is defined in a [GitHub Flavored Markdown](https://github.github.com/gfm/) (**GFM**) document. Each GRS rule must have its own markdown file, and GRS markdown files may only contain a single rule.

- GRS rule files must contain a single markdown `h1` header containing the rule's `message` property.
- Within this `h1` section, GRS rule files may optionally contain a [metadata table](#rule-metadata-table) for customizing the rule's behavior.
- The content from the `h1` section up until any optional example header sections will comprise the rule's `description` property which is intended to explain the rule's intent in natural language.
- The rule's `name` will default to the rule's filename (without the `.md` extension).
  - This can be overridden via the frontmatter metadata's `name` value.
  - If no valid `name` is found, it will fall back to a slugified version of the rule's `message` value (main `h1`).
- GRS rules may optionally contain a single markdown `h3` header named "Bad" or "Incorrect" or "Fail".
  - The content of this section should contain 1 or more code blocks to use as `negativeExamples`.
- GRS rules may optionally contain a single markdown `h3` header named "Good" or "Correct" or "Pass".
  - The content of this section should contain 1 or more code blocks to use as `positiveExamples`.
- It is encouraged to specify a language for all code block examples, but it is not required.

### Rule Frontmatter Metadata

A GRS file may optionally contain [YAML frontmatter](https://jekyllrb.com/docs/front-matter/) for specifying metadata. Note that this is the same frontmatter format used by GitHub, so the metadata renders as an inline table on GitHub ([example](https://github.com/gptlint/gptlint/blob/main/.gptlint/always-handle-promises.md)).

**All metadata fields are optional.**

Here is a breakdown of the supported metadata fields and their expected types.

| Key       | Type                      | Description                                                                                                                                          |
| --------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| name      | `string`                  | Short name of this rule. Defaults to the rule's filename without the `.md` extension.                                                                |
| level     | `warn \| error \| off`    | Default error level of this rule. Defaults to `error`.                                                                                               |
| scope     | `file \| project \| repo` | Granularity at which this rule is applied. Defaults to `file`.                                                                                       |
| fixable   | `boolean`                 | Whether or not this rule supports auto-fixing errors.                                                                                                |
| tags      | `string[]`                | Array of tags / labels.                                                                                                                              |
| eslint    | `string[]`                | Array of [eslint rules](https://eslint.org/docs/latest/rules/) which are related to this rule.                                                       |
| languages | `string[]`                | Array of programming languages this rule should be enabled for.                                                                                      |
| include   | `string[]`                | Array of file glob patterns to include when enforcing this rule. If not specified, will operate on all input source files not excluded by `exclude`. |
| exclude   | `string[]`                | Array of file glob patterns to ignore when enforcing this rule.                                                                                      |
| resources | `string[]`                | Array of URLs with more info on the rule's intent. Very useful for linking to blog posts and internal docs.                                          |

All metadata keys are case-sensitive, and all metadata values must match their expected types if present.

## Example Rules

All built-in rules are available in [.gptlint](https://github.com/gptlint/gptlint/tree/main/.gptlint).

Parsing-wise, [fixtures/rules](https://github.com/gptlint/gptlint/tree/main/fixtures/rules) contains valid rules which test different parts of the spec, and [fixtures/invalid-rules](https://github.com/gptlint/gptlint/tree/main/fixtures/invalid-rules) contains invalid rules which violate the spec and should fail parsing.
