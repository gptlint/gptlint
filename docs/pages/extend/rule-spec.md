# GPTLint Rule Informal Spec

<table>
<tr><td>Version</td><td>0.1.0</td></tr>
<tr><td>Last Updated</td><td>April 9, 2024</td></tr>
<tr><td>Author</td><td><a href="https://twitter.com/transitive_bs">Travis Fischer</a></td></tr>
</table>

## About

The GPTLint Rule Spec (abbreviated **GRS** in this doc) is an attempt to define a standard for how to describe higher-level lint rules that can be enforced across codebases using LLM-based tools compatible with [GPTLint](https://github.com/gptlint/gptlint).

## Rule Format

GRS rules are parsed into the following TypeScript format:

```ts
export type Rule = {
  // core rule definition
  name: string
  message: string
  desc?: string
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

  // internal metadata
  source?: string
}

export type LintRuleScope = 'file' | 'project' | 'repo'
export type LintRuleLevel = 'error' | 'warn' | 'off'
```

See the [full types](https://github.com/gptlint/gptlint/blob/main/src/rule.ts) for more details.

## Rule File Format

A GRS rule is defined in a [GitHub Flavored Markdown](https://github.github.com/gfm/) (**GFM**) document. Each GRS rule must have its own markdown file, and GRS markdown files may only contain a single rule.

- GRS rule files must contain a single markdown `h1` header containing the rule's `message` property.
- Within this `h1` section, GRS rule files may optionally contain a [metadata table](#rule-metadata-table) for customizing the rule's behavior.
- The content from the `h1` section up until any optional example header sections will comprise the rule's `desc` property which is intended to explain the rule's intent in natural language.
- The rule's `name` will be inferred from either the metadata table's `Name` row (preferred) or will fall back to a slugified version of the rule's `message` (main `h1`).
- GRS rules may optionally contain a single markdown `h3` header named "Bad" or "Incorrect" or "Fail".
  - The content of this section should contain 1 or more code blocks to use as `negativeExamples`.
- GRS rules may optionally contain a single markdown `h3` header named "Good" or "Correct" or "Pass".
  - The content of this section should contain 1 or more code blocks to use as `positiveExamples`.
- It is encouraged to specify a language for all code block examples, but it not required.

### Rule Metadata Table

A GRS file may optionally contain a single metadata table formatted as a [GFM table](https://github.github.com/gfm/#tables-extension-). The table must have exactly two columns, the first one for metadata keys and the second one for corresponding values.

All metadata fields are optional.

Here is a breakdown of the supported metadata fields and their expected types.

| Key       | Type                      | Description                                                                                                                                        |
| --------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name      | `string`                  | Short name of this rule. Defaults to the rule's filename without the `.md` extension.                                                              |
| Level     | `warn \| error \| off`    | Default error level of this rule                                                                                                                   |
| Scope     | `file \| project \| repo` | Granularity at which this rule is applied. Defaults to `file`.                                                                                     |
| Fixable   | `boolean`                 | Whether or not this rule supports auto-fixing errors                                                                                               |
| Tags      | `string[]`                | CSV of tags / labels                                                                                                                               |
| Eslint    | `string[]`                | CSV of lower-level [eslint rules](https://eslint.org/docs/latest/rules/) which are related to this rule                                            |
| Languages | `string[]`                | CSV of programming languages this rule should be enabled for. Defaults to `all`.                                                                   |
| Include   | `string[]`                | CSV of file glob patterns to include when enforcing this rule. If not specified, will operate on all input source files not excluded by `exclude`. |
| Exclude   | `string[]`                | CSV of file glob patterns to ignore when enforcing this rule.                                                                                      |
| Resources | `string[]`                | CSV of URLs with more info on the rule's intent. Very useful for linking to blog posts and internal docs                                           |

- Arrays like `Tags` and `Languages` are parsed as comma-separated values.
- Arrays with one elements (no commas) are supported.
- Empty arrays as values are supported.
- Table keys are case-insensitive (`Name` is the same as `name`).
- All table values are stripped of markdown formatting, so values may contain formatting like `inline code blocks`, **bold**, _italics_, etc, and their parsed values will be the same with or without this formatting.
- We considered using [frontmatter](https://github.com/remarkjs/remark-frontmatter) instead of this table format, but found we preferred the ability to see the metadata in the GitHub-rendered markdown along with the ability to apply formatting to the values.

#### Example Rule Metadata Table

Here is an example metadata table.

| Key       | Value                                                   |
| --------- | ------------------------------------------------------- |
| Name      | `prefer-array-at-negative-indexing`                     |
| Level     | error                                                   |
| Fixable   | true                                                    |
| Tags      | general                                                 |
| Languages | javascript, typescript                                  |
| Resources | https://twitter.com/housecor/status/1768622518179369036 |

## Example Rules

Built-in rules are available in [.gptlint](https://github.com/gptlint/gptlint/tree/main/.gptlint).

Parsing-wise, [fixtures/rules](https://github.com/gptlint/gptlint/tree/main/fixtures/rules) contains valid rules which test different parts of the spec, and [fixtures/invalid-rules](https://github.com/gptlint/gptlint/tree/main/fixtures/invalid-rules) contains invalid rules which violate the spec and should fail parsing.
