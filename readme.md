# GPTLint

## CLI

```bash
Usage:
  gptlint [flags...] [file/dir/glob ...]

Flags:
      --cache-dir <string>             Customize the path to the cache directory (default:
                                       "node_modules/.cache/eslint-plus-plus")
  -c, --config <string>                Path to a configuration file
  -d, --debug                          Enables debug logging
      --debug-config                   When enabled, logs the resolved config and parsed rules and then exits
  -D, --debug-model                    Enables verbose LLM logging
  -S, --debug-stats                    Enables logging of cumulative LLM stats at the end, including total tokens and cost
  -e, --early-exit                     Exits after finding the first error
  -g, --guidelines <string>            Glob pattern to guideline markdown files containing rule definitions (default:
                                       ["guidelines.md"])
  -h, --help                           Show help
      --ignore-file <string>           Path to file containing ignore patterns (default: ".eslint-plus-plus-ignore")
      --ignore-pattern <string>        Pattern of files to ignore
      --model <string>                 Which LLM to use for assessing rule conformance (default: "gpt-4-turbo-preview")
      --temperature <number>           LLM temperature parameter
  -C, --no-cache                       Disables caching
      --no-ignore                      Disables the use of ignore files and patterns
      --no-inline-config               Disables the use of inline rule config inside of source files
  -r, --rule <string>                  Glob pattern of rule definition markdown files.
```

## TODO

- guidelines file format
  - support both in the same code block
  - add support to guidelines.md for organizing rules by h1 sections
    - alternatively, just use directories and rule.md file format
- config
  - use eslint, ruff, and conformance as inspiration
  - llm api base url
- linter engine
  - cross-file linting; v0 is strictly local to individual files
  - add support for optionally applying automatic fixes to linter errors
  - add support for only linting changed git deltas
  - add support for different languages
  - add support for different LLM providers
  - add support for `fixable`
  - add support for [openai seed](https://platform.openai.com/docs/api-reference/chat/create#chat-create-seed) and `system_fingerprint` to help make the system more deterministic
  - support disabling rules within files
  - handle context overflow properly depending on selected model
  - **evals**
- update project name in multiple places once we decide on a name
- rules
  - something which captures naming w/ types and consistency
  - if you refer to something as numIterations in one place, refer to it consistently
- `prefer-page-queries.md` code examples give extra context outside of the code blocks
- try claude w/ structured output and nudging it with prefilled / prefix output JSON
- cli
  - improve progress bar; possibly switch to [cli-progress](https://github.com/npkgz/cli-progress)
  - improve progress bar to only take into account non-cached tasks
- publish to NPM

## License

MIT © [Travis Fischer](https://transitivebullsh.it)
