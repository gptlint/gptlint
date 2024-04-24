# Limitations

### Rules in the MVP are single-file only

Many of the higher-level best practices we'd like to support span multiple files, but we also wanted to keep the MVP scoped, so we made the decision to restrict rules to the context of a single file _for now_.

This restriction will be removed once we've validated the MVP with the community, but it will likely remain as an optional rule-specific setting in the future to optimize rules which explicitly don't need multi-file context.

If you'd like to add a rule which requires multi-file context, [please open an issue to discuss](https://github.com/gptlint/gptlint/issues/new).

### Rules in the MVP are JS/TS only

This project is inherently language-agnostic, but in order to keep the MVP scoped, we wanted to focus on the languages & ecosystem that we're most familiar with.

Post-MVP, we're hoping that rules for other programming languages and [library-specific rule configs](https://gptlint.dev/guide/rule-guidelines#library-specific-rule-configs) will trickle in with help from the community over time.

### The MVP does not support autofixing lint errors

This is a feature we have planned in the near future once we'e validated that we're working with the right core rule abstraction.

---

See also our notes on [accuracy](./accuracy) and [cost](./cost).

See the [project roadmap](./roadmap.md) for more details on our plans to address these limitations.
