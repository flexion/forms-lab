import type {
  DeploymentInfo,
  DeploymentSummary,
  HealthStatus,
  ServiceStatus,
} from '../types/deployment'
import { createGitHubClient, getGitHubToken } from './github'

const DEPLOY_ROOT = '/srv/forms-lab'
const PORTS_FILE = `${DEPLOY_ROOT}/ports.json`
const GIT_BIN = '/run/current-system/sw/bin/git'

// PR cache with TTL (5 minutes)
const PR_CACHE_TTL = 5 * 60 * 1000
interface PRCacheEntry {
  data: DeploymentInfo['pullRequest']
  timestamp: number
}
const prCache = new Map<string, PRCacheEntry>()

interface PortsConfig {
  [branch: string]: number
}

/**
 * Read and parse ports.json
 */
async function readPorts(): Promise<PortsConfig> {
  try {
    const { readFile } = await import('node:fs/promises')
    const data = await readFile(PORTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

/**
 * Get git commit info from a worktree
 */
async function getCommitInfo(
  branch: string,
): Promise<DeploymentInfo['commit']> {
  const safeBranch = branch.replace(/\//g, '-')
  const worktreePath = `${DEPLOY_ROOT}/${safeBranch}`

  try {
    const { $ } = await import('bun')

    // Get commit info using explicit git path for NixOS
    const sha = await $`${GIT_BIN} -C ${worktreePath} rev-parse HEAD`
      .text()
      .then((s) => s.trim())
    const shortSha = sha.slice(0, 7)
    const message = await $`${GIT_BIN} -C ${worktreePath} log -1 --pretty=%s`
      .text()
      .then((s) => s.trim())
    const author = await $`${GIT_BIN} -C ${worktreePath} log -1 --pretty=%an`
      .text()
      .then((s) => s.trim())
    const date = await $`${GIT_BIN} -C ${worktreePath} log -1 --pretty=%cI`
      .text()
      .then((s) => s.trim())

    return {
      sha,
      shortSha,
      message,
      author,
      date,
      githubUrl: `https://github.com/flexion/forms-lab/commit/${sha}`,
    }
  } catch (error) {
    // Log error for debugging
    console.error(`Failed to get git info for ${branch}:`, error)
    return {
      sha: 'unknown',
      shortSha: 'unknown',
      message: 'Unknown',
      author: 'Unknown',
      date: new Date().toISOString(),
      githubUrl: 'https://github.com/flexion/forms-lab',
    }
  }
}

/**
 * Get systemd service status
 */
async function getServiceStatus(
  branch: string,
): Promise<DeploymentInfo['service']> {
  const safeBranch = branch.replace(/\//g, '-')
  const unitName = `forms-lab-app@${safeBranch}.service`

  try {
    const { $ } = await import('bun')

    // Check if service is active
    const isActive = await $`systemctl is-active ${unitName}`
      .text()
      .then((s) => s.trim())

    const status: ServiceStatus =
      isActive === 'active'
        ? 'running'
        : isActive === 'reloading'
          ? 'restarting'
          : isActive === 'failed'
            ? 'failed'
            : 'inactive'

    // Get uptime if running
    let uptime: string | undefined
    if (status === 'running') {
      try {
        const uptimeStr =
          await $`systemctl show ${unitName} -p ActiveEnterTimestamp --value`
            .text()
            .then((s) => s.trim())
        if (uptimeStr && uptimeStr !== 'n/a') {
          const startTime = new Date(uptimeStr)
          const now = new Date()
          const diff = now.getTime() - startTime.getTime()
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          uptime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
        }
      } catch {
        // Ignore uptime errors
      }
    }

    return { status, uptime }
  } catch {
    return { status: 'inactive' }
  }
}

/**
 * Check health endpoint
 */
async function getHealthStatus(url: string): Promise<DeploymentInfo['health']> {
  const healthUrl = `${url}health`
  const startTime = Date.now()

  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(5000),
    })

    const responseTime = Date.now() - startTime

    if (response.ok) {
      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
      }
    }

    return {
      status: 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: `HTTP ${response.status} ${response.statusText}`,
    }
  } catch (error) {
    return {
      status: 'unknown',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}

/**
 * Get GitHub PR info for a branch (with caching)
 */
async function getPullRequestInfo(
  branch: string,
): Promise<DeploymentInfo['pullRequest']> {
  // Check cache first
  const cached = prCache.get(branch)
  if (cached && Date.now() - cached.timestamp < PR_CACHE_TTL) {
    return cached.data
  }

  try {
    const token = await getGitHubToken()
    const client = createGitHubClient(token)
    const pr = await client.findPullRequest('flexion', 'forms-lab', branch)

    if (!pr) {
      // Cache null result to avoid repeated queries for branches without PRs
      prCache.set(branch, { data: undefined, timestamp: Date.now() })
      return undefined
    }

    const prInfo: DeploymentInfo['pullRequest'] = {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      status: pr.merged_at ? 'merged' : pr.state === 'open' ? 'open' : 'closed',
    }

    // Cache the result
    prCache.set(branch, { data: prInfo, timestamp: Date.now() })
    return prInfo
  } catch (error) {
    console.error(`Failed to fetch PR info for ${branch}:`, error)
    return undefined
  }
}

/**
 * Get full deployment info for a branch
 */
export async function getDeploymentInfo(
  branch: string,
  port: number,
): Promise<DeploymentInfo> {
  // All branches deploy to /<branch>/ (main is treated like any other branch)
  const safeBranch = branch.replace(/\//g, '-')
  const url = `/${safeBranch}/`

  // Collect metadata in parallel (PR info last to avoid blocking on GitHub API)
  const [commit, service, health] = await Promise.all([
    getCommitInfo(branch),
    getServiceStatus(branch),
    getHealthStatus(`http://localhost:${port}${url}`),
  ])

  // Fetch PR info separately (with timeout)
  let pullRequest: DeploymentInfo['pullRequest']
  try {
    pullRequest = await Promise.race([
      getPullRequestInfo(branch),
      new Promise<undefined>((resolve) =>
        setTimeout(() => resolve(undefined), 2000),
      ),
    ])
  } catch {
    pullRequest = undefined
  }

  return {
    branch,
    port,
    url,
    commit,
    service,
    health,
    pullRequest,
  }
}

/**
 * Get all deployment info with summary statistics
 */
export async function getDeploymentSummary(): Promise<DeploymentSummary> {
  const ports = await readPorts()
  const branches = Object.entries(ports)

  // Get deployment info for all branches in parallel
  const deployments = await Promise.all(
    branches.map(([branch, port]) => getDeploymentInfo(branch, port)),
  )

  const healthyDeployments = deployments.filter(
    (d) => d.service.status === 'running' && d.health.status === 'healthy',
  ).length

  const failedDeployments = deployments.filter(
    (d) => d.service.status === 'failed' || d.health.status === 'unhealthy',
  ).length

  return {
    totalDeployments: deployments.length,
    healthyDeployments,
    failedDeployments,
    deployments,
  }
}
