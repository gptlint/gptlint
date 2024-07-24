# CLI

```bash
Usage:
  gptlint [flags...] [file/dir/glob ...]

Flags:
      --api-base-url <string>               Base URL for the LLM API to use which must be compatible with the OpenAI
                                            chat completions API. Defaults to the OpenAI API.
  -k, --api-key <string>                    API key for the OpenAI-compatible LLM API. Defaults to the value of the
                                            `OPENAI_API_KEY` environment variable.
      --api-organization-id <string>        Optional organization ID that should be billed for LLM API requests. This is
                                            only necessary if your OpenAI API key is scoped to multiple organizations.
      --cache-dir <string>                  Customize the path to the cache directory
      --concurrency <number>                Limits the maximum number of concurrent tasks
  -c, --config <string>                     Path to a configuration file
  -d, --debug                               Enables debug logging
  -g, --debug-grit                          Enables verbose Grit logging
  -D, --debug-model                         Enables verbose LLM logging
      --dry-run                             Disables all external LLM calls and outputs an estimate of what it would
                                            cost to run the linter on the given config
  -e, --early-exit                          Exits after finding the first error
  -h, --help                                Show help
      --ignore-file <string>                Path to file containing ignore patterns (default: ".gptlintignore")
      --ignore-pattern <string>             Pattern of files to ignore (in addition to .gptlintignore)
  -m, --model <string>                      Which LLM to use for assessing rule conformance. Defaults to gpt-4.
  -C, --no-cache                            Disables caching
  -S, --no-debug-stats                      Disables logging of cumulative LLM stats, including total tokens and cost
                                            (logging LLM stats is enabled by default)
  -G, --no-grit                             Disables grit
      --no-ignore                           Disables the use of ignore files and patterns
      --no-inline-config                    Disables the use of inline rule config inside of source files
      --print-config                        When enabled, logs the resolved config and parsed rules and then exits
  -r, --rules <string>                      Glob pattern to rule definition markdown files.
      --temperature <number>                LLM temperature parameter
  -M, --weak-model <string>                 Which weak LLM to use for assessing rule conformance (optional; used for
                                            multi-pass linting; set to "none" to disable two-pass linting). Defaults to
                                            gpt-4o-mini.
```

## Important Flags

The most important CLI flags to call out are:

- `--dry-run` lets you estimate how much running `gptlint` on your codebase will cost with the current config settings applied. All external API calls are mocked out, so running `gptlint --dry-run` will always be free.
- `-C` or `--no-cache` forces the linter to override any previously cached results.
- `-d` or `--debug` enables debug logging so you can see the underlying model responses.
  - This is very useful when debugging and iterating on custom rules.
- `-m` or `--model` overrides the strong model, which is only used in the second pass for two-pass linting.
- `-M` or `--weak-model` overrides the weak model, which is used in the first pass for two-pass linting.
  - If you want to use a single LLM, just pass it to both `-m` and `-M` like this: `gptlint -m gpt-4-turbo -M gpt-4-turbo`
- `--print-config` will log the fully resolved config, rules, and source files that `gptlint` will operate on and then exit without actually performing any linting.
  - This is very useful for validating that your project is configured correctly, especially when you're seeing unexpected results or working with custom rules and models.

Most of the CLI options have equivalent [config options](./config.mdx). Config files are preferred for general project configuration, whereas CLI options are more useful for customizing `gptlint` runs on-the-fly.

## Examples

```sh
# run the linter to estimate LLM costs without actually make any API calls
gptlint --dry-run
```

```sh
# enable debugging and only enable a single rule
gptlint -d -r rules/semantic-variable-names.md
```

```sh
# disable caching, enable debugging, and only run on a single source file
gptlint -C -d src/utils.ts
```

Oftentimes, it's useful when iterating on custom rules to only run the linter with a single rule enabled on a single soruce file and with caching disabled:

```sh
gptlint -C -d -r rules/semantic-variable-names.md src/utils.ts
```
