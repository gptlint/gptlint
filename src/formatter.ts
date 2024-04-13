import prettier, { type BuiltInParserName } from 'prettier'

const fileTypeToParserMap: Record<string, BuiltInParserName> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'typescript',
  jsx: 'typescript',
  cjs: 'typescript',
  mjs: 'typescript',
  html: 'html',
  md: 'markdown',
  css: 'css',
  json: 'json5'
}

/**
 * Attempts to format the given source code using Prettier.
 *
 * @TODO In the future, add support for formatting other languages like Python.
 */
export async function formatSource(
  source: string,
  {
    parser,
    fileType
  }:
    | {
        parser?: BuiltInParserName
        fileType?: never
      }
    | {
        parser?: never
        fileType?: string
      } = {}
): Promise<string> {
  if (fileType) {
    parser = fileTypeToParserMap[fileType]
  }

  if (!parser) {
    // If the source is an unrecognized or unknown format, don't try to format
    // it and instead just return the original, unformatted source.
    return source
  }

  return prettier.format(source, {
    parser,
    semi: false,
    singleQuote: true,
    useTabs: false,
    tabWidth: 2,
    bracketSpacing: true,
    arrowParens: 'always',
    trailingComma: 'none'
  })
}
