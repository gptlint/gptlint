# Config

All GPTLint config is inspired by [ESLint's new flat config format](https://eslint.org/docs/latest/use/configure/configuration-files), so if you've used `eslint`, configuring `gptlint` will be a breeze.

Just like ESLint, GPTLint supports a variety of ways to customize and extend it's behavior and linting rules. Configs can come from the following places places, with more specific configs overriding more general config settings:

- default settings
- project-specific config file (`gptlint.config.{js,mjs,cjs}`)
- CLI flags (all of the main config settings have CLI flags which override any config file settings)
- inline config overrides (`/** gptlint-disable */`)

In the near future, we'll be moving the current set of default JS/TS rules into an NPM package `@gptlint/typescript-config`, and in general this is the expected way to provide reusable third-party rules and bundles of customized, pre-configured rules. In general, we're trying to follow ESLint's config design as closely as possible.

## Print Config

You can always run `gptlint --print-config` to print out exactly what rules, files, and settings are being resolved by GPTLint.

**The `--print-config` option is extremely useful** for making sure your project is set up correctly and to validate that you understand how it's working under the hood.

## Config File

The GPTLint configuration file may be named any of the following:

- `gptlint.config.js`
- `gptlint.config.mjs`
- `gptlint.config.cjs`

It should be placed in the root directory of your project and export an array of [configuration objects](#linterconfig-objects). Here’s an example:

```js
// gptlint.config.js
export default [
  {
    rules: {
      'always-handle-promises': 'warn',
      'semantic-variable-names': 'off'
    }
  }
]
```

In this example, the configuration array contains just one configuration object. The configuration object will be merged with the default config to set `always-handle-promises` violations to warnings and to disable the `semantic-variable-names` rule for all files.

### LinterConfig Objects

LinterConfig objects are validated against a [LinterConfigSchema](https://github.com/gptlint/gptlint/tree/main/src/config.ts) zod schema which has a very similar shape to [ESLint Configuration Objects](https://eslint.org/docs/latest/use/configure/configuration-files#configuration-objects).

```ts
export type LinterConfig = {
  files?: string[] // array of glob to search for source files
  ignores?: [] // array of glob to ignore for source files

  ruleFiles?: [] // array of globs to find project-specific rule md files
  ruleDefinitions?: Rule[] // custom rules (extensible to non-md formats)

  // enable / disable rules
  rules?: Record<string, 'error' | 'warn' | 'off'>

  // customize linter options (debug, cache dir, logging, etc)
  linterOptions?: LinterOptions

  // customize LLM model and provider options
  llmOptions?: LLMOptions
}
```

See the [source](https://github.com/gptlint/gptlint/tree/main/src/config.ts) for more details.

## Custom Rules

By default, `ruleFiles` will search `[ '.gptlint/**/*.md' ]` for project-specific rule definition markdown files.

You can override this with the `ruleFiles` config setting or with the `--rules` (`-r`) CLI flag.

### Code-Based Custom Rules

You can also specify code-based custom [Rule](https://github.com/gptlint/gptlint/tree/main/src/rule.ts) definitions which are normal JS/TS objects with hooks for fully customizing linting behavior.

An example of a code-based rule (the equivalent of a plugin in `eslint`) is [effective-tsconfig](https://github.com/gptlint/gptlint/tree/main/.gptlint/custom/effective-tsconfig.ts), which has a `project` `scope` and uses the `preProcessProject` hook to resolve a project's `tsconfig.json` file and check for best practices.

Here's an example:

```js
// my-custom-rule.ts
/** @type {Readonly<import('gptlint').Rule>} */
export default {
  name: 'my-custom-rule',
  message: 'Example rule message.',
  level: 'error',
  scope: 'file',

  preProcessFile: async ({ file, rule, cache, config, cwd }) => {
    return {
      lintErrors: [
        {
          message: 'This is an example custom lint error',
          level: 'error',
          file: file.fileRelativePath
        }
      ]
    }
  }
}
```

```js
// gptlint.config.js
import myCustomRule from './build/my-custom-rule.js'

/** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    ruleDefinitions: [myCustomRule]
  }
]
```

## Example Config Files

**Using `gpt-4-turbo-preview`:**

```js
// gptlint.config.js

/** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    llmOptions: {
      model: 'gpt-4-turbo-preview',
      weakModel: 'gpt-3.5-turbo'
    }
  }
]
```

**Using Anthropic Claude via OpenRouter:**

See [Using Anthropic](./llm-providers.md#anthropic) for more info.

```js
// gptlint.config.js

/** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    llmOptions: {
      apiBaseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3-opus:beta',
      weakModel: 'anthropic/claude-3-haiku:beta',
      // Optional
      kyOptions: {
        headers: {
          // Optional, for including your app on openrouter.ai rankings.
          'HTTP-Referer': 'https://github.com/gptlint/gptlint',
          // Optional, shows in rankings on openrouter.ai.
          'X-Title': 'gptlint'
        }
      }
    }
  }
]
```

## Differences from ESLint Config Format

Currently, all `gptlint` config objects are merged together into a single, flat, final config. This differs from ESLint's config array in that individual ESLint config objects can target different files with different config settings.

Our goal is to match `gptlint`'s flat file config behavior 1:1 in the future, with the current solution being a compromise that seems to work well in practice.

If you're ever not sure how your config is being resolved or why you're seeing unexpected behavior, double-check the output of `gptlint --print-config`.