export { AbortError } from 'p-retry'

export class RetryableError extends Error {}

export class ParseError extends RetryableError {}
