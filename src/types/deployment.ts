export type ServiceStatus = 'running' | 'failed' | 'restarting' | 'inactive'
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown'
export type PullRequestStatus = 'open' | 'closed' | 'merged'

export interface DeploymentInfo {
  branch: string
  port: number
  url: string

  // Git info (from worktree)
  commit: {
    sha: string
    shortSha: string
    message: string
    author: string
    date: string
    githubUrl: string
  }

  // Service status (from systemd)
  service: {
    status: ServiceStatus
    uptime?: string
    memory?: string
  }

  // Health check (from HTTP)
  health: {
    status: HealthStatus
    responseTime?: number
    lastCheck: string
    error?: string
  }

  // GitHub PR info (optional)
  pullRequest?: {
    number: number
    title: string
    url: string
    status: PullRequestStatus
  }

  // Timestamps
  lastDeployed?: string
}

export interface DeploymentSummary {
  totalDeployments: number
  healthyDeployments: number
  failedDeployments: number
  deployments: DeploymentInfo[]
}
