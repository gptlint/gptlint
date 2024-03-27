# Be consistent with identifier casing

| Key       | Value                        |
| --------- | ---------------------------- |
| Name      | consistent-identifier-casing |
| Level     | error                        |
| Fixable   | false                        |
| Tags      | general                      |
| Languages | all                          |

Identifiers of the same type should use consistent casing. This rule applies to all types of identifiers: variable names, class names, type names, function names, constants, etc.

For example, if some variable names use camelCase, then all variable names should use camelCase. If some type names use PascalCase, then all type names should use PascalCase. If some constants use CONSTANT_CASE, then all constants should use constant case.

### Bad

```ts
// This is bad because variable identifiers should use consistent casing.
const fooBar = true
const default_timeout = 5000

// This is bad because function identifiers should use consistent casing.
function helloWorld() {}
function hello_twitter() {}
```

### Good

```ts
const fooBar = true
const defaultTimeout = 5000

function helloWorld() {}
function helloTwitter() {}
```
