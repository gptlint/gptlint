# LLM Providers

GPTLint supports any chat LLM which exposes an OpenAI-compatible chat completions API. Specific instructions for the most popular LLM providers and local, open source models are included below.

## OpenAI

This is the default. Just export an `OPENAI_API_KEY` environment variable either via your environment, a local `.env` file, or via the CLI `--apiKey` flag.

The default model is `gpt-4`. We're not using `gpt-4-turbo-preview` as the default because some developers don't have access to it. The default `weakModel` is `gpt-3.5-turbo` which is used for [two-pass linting](../project/how-it-works.md#two-pass-linting).

If you have access to `gpt-4-turbo-preview`, it is recommended to use over `gpt-4` by adding a [config file](./config.mdx) to your project. For example:

```js filename="gptlint.config.js"
/** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    llmOptions: {
      model: 'gpt-4-turbo-preview',
      weakModel: 'gpt-3.5-turbo'
    }
  }
]
```

## Anthropic

Anthropic Claude is supported by using a proxy such as [OpenRouter](https://openrouter.ai/).

- [Claude 3 Opus](https://openrouter.ai/models/anthropic/claude-3-opus:beta) (powerful, but very expensive)
- [Claude 3 Sonnet](https://openrouter.ai/models/anthropic/claude-3-sonnet:beta) (balanced)
- [Claude 3 Haiku](https://openrouter.ai/models/anthropic/claude-3-haiku:beta)

Export your OpenRouter API key as an `OPENAI_API_KEY` environment variable either via your environment, a local `.env` file, or via the CLI `--apiKey` flag.

```js filename="gptlint.config.js"
/** @type {import('gptlint').GPTLintConfig} */
export default [
  {
    llmOptions: {
      apiBaseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3-opus:beta',
      weakModel: 'anthropic/claude-3-haiku:beta',
      // Optional
      kyOptions: {
        headers: {
          // Optional, for including your app on openrouter.ai rankings
          'HTTP-Referer': 'https://gptlint.dev',
          // Optional, shows in rankings on openrouter.ai
          'X-Title': 'gptlint'
        }
      }
    }
  }
]
```

## Local Models

- [ollama](https://github.com/ollama/ollama) supports exposing a local [OpenAI compatible server](https://github.com/ollama/ollama/blob/main/docs/openai.md)
- [vLLM](https://github.com/vllm-project/vllm) supports exposing a local [OpenAI compatible server](https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html)

Use the `apiBaseUrl` and `apiKey` config / CLI params to point GPTLint to your local model server.

In production, you may want to consider using a cloud provider that offers inference and fine-tuning APIs such as:

- [Together.ai](https://www.together.ai)
- [Anyscale](https://www.anyscale.com/private-endpoints)
- [Modal Labs](https://modal.com/use-cases/language-models)
