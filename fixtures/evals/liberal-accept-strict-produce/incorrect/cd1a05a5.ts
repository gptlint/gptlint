// Expects a specific string format, doesn't handle other valid string formats
function parseDate(dateStr: string): Date {
  // Only accepts YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }
  return new Date(dateStr)
}

// Generated by gpt-4-0125-preview
