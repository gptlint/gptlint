async function performBackup() {
  // Perform a backup operation
}

// Violation: performBackup is invoked without awaiting or chaining with .then/.catch.
performBackup()
console.log('Backup initiated') // This doesn't ensure backup completion.

// Generated by gpt-4-0125-preview