// Logging database query that contains user's phone number
const query = `SELECT * FROM users WHERE phoneNumber = '${user.phoneNumber}'`
console.log('Executing query:', query)
// VIOLATION: Exposes user's phone number in logs.

// Generated by gpt-4-0125-preview
