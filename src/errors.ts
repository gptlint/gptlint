import { AbortError } from 'p-retry'

export { AbortError }

export class RetryableError extends Error {}

export class ParseError extends RetryableError {}
