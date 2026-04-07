export interface GitHubIssue {
  number: number
  title: string
  body: string | null
  state: string
  labels: Array<{ name: string }>
  milestone: { title: string } | null
}

export interface GitHubClient {
  listIssues(
    owner: string,
    repo: string,
    labels: string,
  ): Promise<GitHubIssue[]>
}

export function createGitHubClient(token?: string): GitHubClient {
  return {
    async listIssues(owner, repo, labels) {
      const url = `https://api.github.com/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(labels)}&state=all&per_page=100`
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(url, { headers })
      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
      }

      return res.json() as Promise<GitHubIssue[]>
    },
  }
}

export async function getGitHubToken(): Promise<string | undefined> {
  // Try env var first
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN
  }

  // Fall back to gh CLI
  try {
    const proc = Bun.spawn(['gh', 'auth', 'token'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const output = await new Response(proc.stdout).text()
    return output.trim() || undefined
  } catch {
    return undefined
  }
}
