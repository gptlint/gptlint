async function clearCache() {
  // Clear application cache
}

// Violation: clearCache is called without handling its Promise in a try/catch block.
try {
  clearCache()
} catch (error) {
  console.error('Failed to clear cache', error)
}

// Generated by gpt-4-0125-preview
