export interface GitHubIssue {
  number: number
  title: string
  body: string | null
  state: string
  labels: Array<{ name: string }>
  milestone: { title: string } | null
}

export interface GitHubPullRequest {
  number: number
  title: string
  state: 'open' | 'closed'
  merged_at: string | null
  html_url: string
  head: {
    ref: string
  }
}

export interface GitHubDeployment {
  id: number
  url: string
}

export type DeploymentState =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failure'
  | 'error'
  | 'inactive'

export interface GitHubClient {
  listIssues(
    owner: string,
    repo: string,
    labels: string,
  ): Promise<GitHubIssue[]>
  findPullRequest(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<GitHubPullRequest | null>
  createDeployment(
    owner: string,
    repo: string,
    ref: string,
    environment: string,
    description?: string,
  ): Promise<GitHubDeployment>
  createDeploymentStatus(
    owner: string,
    repo: string,
    deploymentId: number,
    state: DeploymentState,
    environmentUrl?: string,
    description?: string,
  ): Promise<void>
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

    async findPullRequest(owner, repo, branch) {
      // Search for open PRs with this head branch
      const url = `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${branch}&state=all&per_page=1`
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      try {
        const res = await fetch(url, { headers })
        if (!res.ok) {
          return null
        }

        const prs = (await res.json()) as GitHubPullRequest[]
        return prs.length > 0 ? prs[0] : null
      } catch {
        return null
      }
    },

    async createDeployment(owner, repo, ref, environment, description) {
      const url = `https://api.github.com/repos/${owner}/${repo}/deployments`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ref,
          environment,
          description: description || `Deploy ${ref} to ${environment}`,
          auto_merge: false,
          required_contexts: [],
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(
          `Failed to create deployment: ${res.status} ${res.statusText} — ${body}`,
        )
      }

      const data = (await res.json()) as { id: number; url: string }
      return { id: data.id, url: data.url }
    },

    async createDeploymentStatus(
      owner,
      repo,
      deploymentId,
      state,
      environmentUrl,
      description,
    ) {
      const url = `https://api.github.com/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          state,
          auto_inactive: true,
          ...(environmentUrl ? { environment_url: environmentUrl } : {}),
          ...(description ? { description } : {}),
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(
          `Failed to create deployment status: ${res.status} ${res.statusText} — ${body}`,
        )
      }
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
