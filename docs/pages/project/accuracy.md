# Accuracy

This tool uses one or more LLMs to identify rule violations in your code (see [how it works](./how-it-works.md) for details), so depending on the languag models and the quality of the rules you're using, it's possible for the linter to produce **false positives** (hallucinated errors which shouldn't have been reported) and/or **false negatives** (real errors that the tool missed).

**All built-in rules are extensively tested** with evals to ensure that the linter is as accurate as possible by default. We're also working on a more integrated feedback loop to gather data and improve the linter's quality over time. If you're in this feature, please [reach out to our team](mailto:gptlint@teamduality.dev).

Keep in mind that even expert human developers are unlikely to reach perfect accuracy when reviewing large codebases (we all miss things, get tired, get distracted, etc), **so the goal of this project is not to achieve 100% accuracy, but rather to surpass human expert-level accuracy on this narrow task at a fraction of the cost and speed**.

_(we're using accuracy here as a shorthand for precision / recall)_
