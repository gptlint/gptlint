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
  -D, --debug-model                         Enables verbose LLM logging
  -e, --early-exit                          Exits after finding the first error
  -h, --help                                Show help
      --ignore-file <string>                Path to file containing ignore patterns (default: ".gptlintignore")
      --ignore-pattern <string>             Pattern of files to ignore (in addition to .gptlintignore)
  -m, --model <string>                      Which LLM to use for assessing rule conformance. Defaults to gpt-4.
  -C, --no-cache                            Disables caching
  -S, --no-debug-stats                      Disables logging of cumulative LLM stats, including total tokens and cost
                                            (logging LLM stats is enabled by default)
      --no-ignore                           Disables the use of ignore files and patterns
      --no-inline-config                    Disables the use of inline rule config inside of source files
      --print-config                        When enabled, logs the resolved config and parsed rules and then exits
  -r, --rules <string>                      Glob pattern to rule definition markdown files.
      --temperature <number>                LLM temperature parameter
  -M, --weak-model <string>                 Which weak LLM to use for assessing rule conformance (optional; used for
                                            multi-pass linting; set to "none" to disable two-pass linting). Defaults to
                                            gpt-3.5-turbo.
```
