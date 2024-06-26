function updateProfile(user, changes) {
  // Early return if no changes are provided
  if (Object.keys(changes).length === 0) return user

  // Applying changes to the user
  return { ...user, ...changes }
  // This adheres to the rule by returning early if there are no changes to apply.
}

// Generated by gpt-4-0125-preview
