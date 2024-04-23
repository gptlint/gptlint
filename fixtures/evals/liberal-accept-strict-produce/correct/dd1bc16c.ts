// Accepts an object with any properties, returns a sanitized object with only specified keys
function sanitizeObject<T extends object>(obj: T, keys: string[]): Partial<T> {
  const sanitized: Partial<T> = {}
  keys.forEach((key) => {
    if (key in obj) {
      sanitized[key] = obj[key]
    }
  })
  // Produces an object strictly conforming to the specified keys
  return sanitized
}

// Generated by gpt-4-0125-preview
