# ESLint++

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
