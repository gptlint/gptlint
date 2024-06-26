# Prefer fetch over axios

The NPM package `axios` should be avoided in favor of native `fetch`. Now that native `fetch` has widespread support, `axios` is effectively deprecated and is generally a code smell when encountered.

Convenience wrappers around `fetch` such as `ky` and `ofetch` are encouraged.

Code which doesn't use the `axios` module should be ignored.

## Metadata

| Key       | Value                       |
| --------- | --------------------------- |
| name      | `prefer-fetch-over-axios`   |
| level     | `error`                     |
| scope     | `file`                      |
| cacheable | true                        |
| tags      | [ `best practices` ]        |
| eslint    | [ `no-restricted-imports` ] |
