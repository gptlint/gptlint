/**
 * Fetches user data from an API.
 */
async function fetchUserData(userId: string): Promise<UserData> {
  // This comment adheres to the rule by describing the purpose without repeating type information.
  return fetch(`/api/users/${userId}`).then((res) => res.json())
}

// Generated by gpt-4-0125-preview
