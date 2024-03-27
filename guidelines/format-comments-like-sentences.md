# Format comments like sentences

| Key       | Value                          |
| --------- | ------------------------------ |
| Name      | format-comments-like-sentences |
| Level     | error                          |
| Fixable   | true                           |
| Tags      | general                        |
| Languages | all                            |

Capitalize the first word unless it's a case-sensitive identifier. End it with a period (or "!" or "?", I suppose). This is true for all comments: doc comments, inline stuff, even TODOs. Even if it's a sentence fragment.

### Bad

```ts
// quick comment
```

### Good

```ts
// Quick comment.
```
