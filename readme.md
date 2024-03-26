# ESLint++

## CLI

```bash
Usage:
  lint [flags...] [file/dir/glob ...]

Flags:
      --cache-dir <string>             Customize the path to the cache directory (default:
                                       "node_modules/.cache/eslint-plus-plus")
  -c, --config <string>                Path to a configuration file
  -d, --debug                          Enables debug logging
      --debug-config                   When enabled, logs the resolved config and parsed rules and then exits
  -D, --debug-model                    Enables verbose LLM debugging
  -S, --debug-stats                    Enables logging of cumulative LLM stats at the end (total tokens and cost)
  -e, --early-exit                     Exits after finding the first error
  -g, --guidelines <string>            Glob pattern to guideline markdown files containing rule definitions (default:
                                       ["guidelines.md"])
  -h, --help                           Show help
      --ignore-file <string>           Path to file containing ignore patterns (default: ".eslint-plus-plus-ignore")
      --ignore-pattern <string>        Pattern of files to ignore
      --model <string>                 Which LLM to use for assessing rule conformance (default: "gpt-4-turbo-preview")
  -C, --no-cache                       Disables the built-in cache
      --no-ignore                      Disables the use of ignore files and patterns
      --no-inline-config               Disables the use of inline rule config inside of source files
  -r, --rule <string>                  Glob pattern of rule definition markdown files.
      --temperature <number>           LLM temperature parameter
```

## TODO

- guidelines file format
  - figure out the best way to specify metadata
    - name
    - error level
    - category
    - fixable
  - the rendered markdown needs to make it clear whether code blocks are positive or negative examples
  - support both in the same code block
  - add support for organizing rules by h1 sections
  - add support for a rules directory
- config file
  - use eslint, ruff, and conformance as inspiration
- linter engine
  - cross-file linting; v0 is strictly local to individual files
  - add support for optionally applying automatic fixes to linter errors
  - add support for only linting changed git deltas
  - add support for any language
- CLI
  - add support for diff LLM providers

## License

MIT © [Travis Fischer](https://transitivebullsh.it)
