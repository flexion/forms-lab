export interface GitHubUser {
  login: string
  name: string
  avatar_url: string
}

export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri?: string,
): Promise<string> {
  const body: Record<string, string> = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
  }
  if (redirectUri) {
    body.redirect_uri = redirectUri
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  const data = await response.json()
  if (data.error || !data.access_token) {
    throw new Error(
      `Failed to exchange code for token: ${data.error || 'no access_token'}`,
    )
  }
  return data.access_token
}

export async function fetchUserProfile(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return await response.json()
}

export async function checkOrgMembership(
  token: string,
  org: string,
): Promise<boolean> {
  // Check if user is a member of the specified organization
  const response = await fetch('https://api.github.com/user/orgs', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    console.error(
      `Org membership check failed: HTTP ${response.status}`,
    )
    return false
  }

  const orgs = await response.json()
  return orgs.some((o: { login: string }) => o.login === org)
}

export async function checkRepoPermission(
  token: string,
  _username: string,
  repo: string,
): Promise<boolean> {
  // Use the repo endpoint which returns the authenticated user's permissions
  // directly. The collaborator endpoint requires admin access on org repos.
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    console.error(
      `Permission check failed for ${repo}: HTTP ${response.status}`,
    )
    return false
  }

  const data = await response.json()
  const permissions = data.permissions

  return permissions?.push === true || permissions?.admin === true
}
