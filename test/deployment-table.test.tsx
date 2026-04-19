import { describe, expect, it } from 'bun:test'
import {
  DeploymentTable,
  getCombinedHealthLabel,
  getCombinedHealthStatus,
  relativeTime,
} from '../src/entrypoints/dashboard/deployment-table'
import type { DeploymentInfo } from '../src/services/deployment'
import { sortDeploymentsByDate } from '../src/services/deployment'

function makeDeployment(branch: string, date: string): DeploymentInfo {
  return {
    branch,
    port: 3001,
    url: `/${branch}/`,
    commit: {
      sha: 'abc123',
      shortSha: 'abc123',
      message: `commit on ${branch}`,
      author: 'Dev',
      date,
      githubUrl: `https://github.com/flexion/forms-lab/commit/abc123`,
    },
    service: { status: 'running' },
    health: { status: 'healthy', lastCheck: new Date().toISOString() },
  }
}

export { makeDeployment }

describe('sortDeploymentsByDate', () => {
  it('sorts deployments most recently updated first', () => {
    const old = makeDeployment('old-branch', '2026-04-01T00:00:00Z')
    const mid = makeDeployment('mid-branch', '2026-04-05T00:00:00Z')
    const recent = makeDeployment('recent-branch', '2026-04-10T00:00:00Z')

    const sorted = sortDeploymentsByDate([old, recent, mid])

    expect(sorted[0].branch).toBe('recent-branch')
    expect(sorted[1].branch).toBe('mid-branch')
    expect(sorted[2].branch).toBe('old-branch')
  })
})

describe('getCombinedHealthStatus', () => {
  it('returns healthy when service running and health healthy', () => {
    expect(getCombinedHealthStatus('running', 'healthy')).toBe('healthy')
  })

  it('returns failed when service failed', () => {
    expect(getCombinedHealthStatus('failed', 'healthy')).toBe('failed')
  })

  it('returns unhealthy when health unhealthy', () => {
    expect(getCombinedHealthStatus('running', 'unhealthy')).toBe('unhealthy')
  })

  it('returns unknown when health unknown', () => {
    expect(getCombinedHealthStatus('running', 'unknown')).toBe('unknown')
  })

  it('returns inactive when service inactive', () => {
    expect(getCombinedHealthStatus('inactive', 'unknown')).toBe('inactive')
  })
})

describe('getCombinedHealthLabel', () => {
  it('returns Healthy for healthy status', () => {
    expect(getCombinedHealthLabel('healthy')).toBe('Healthy')
  })

  it('returns Failed for failed status', () => {
    expect(getCombinedHealthLabel('failed')).toBe('Failed')
  })

  it('returns Unhealthy for unhealthy status', () => {
    expect(getCombinedHealthLabel('unhealthy')).toBe('Unhealthy')
  })

  it('returns Unknown for unknown status', () => {
    expect(getCombinedHealthLabel('unknown')).toBe('Unknown')
  })

  it('returns Inactive for inactive status', () => {
    expect(getCombinedHealthLabel('inactive')).toBe('Inactive')
  })
})

describe('relativeTime', () => {
  it('returns "just now" for recent dates', () => {
    expect(relativeTime(new Date().toISOString())).toBe('just now')
  })

  it('returns minutes for dates within the hour', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(relativeTime(fiveMinAgo)).toBe('5m ago')
  })

  it('returns hours for dates within the day', () => {
    const threeHoursAgo = new Date(
      Date.now() - 3 * 60 * 60 * 1000,
    ).toISOString()
    expect(relativeTime(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days for older dates', () => {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString()
    expect(relativeTime(twoDaysAgo)).toBe('2d ago')
  })
})

describe('DeploymentTable', () => {
  it('renders empty message when no deployments', () => {
    const html = DeploymentTable({ deployments: [] })?.toString() ?? ''
    expect(html).toContain('No branches currently deployed')
  })

  it('renders header row with column labels', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('Branch')
    expect(html).toContain('Last Updated')
    expect(html).toContain('Commit')
    expect(html).toContain('PR')
    expect(html).toContain('Health')
  })

  it('renders branch name linked to deployment URL', () => {
    const deployment = makeDeployment('feature-x', '2026-04-10T00:00:00Z')
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('href="/feature-x/"')
    expect(html).toContain('feature-x')
  })

  it('renders commit SHA linked to GitHub', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('abc123')
    expect(html).toContain(
      'href="https://github.com/flexion/forms-lab/commit/abc123"',
    )
  })

  it('renders combined health badge as Healthy for running+healthy', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('Healthy')
  })

  it('renders combined health badge as Failed for failed service', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    deployment.service.status = 'failed'
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('Failed')
  })

  it('renders "No PR" when no pull request', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('No PR')
  })

  it('renders PR number and status when pull request exists', () => {
    const deployment = makeDeployment('feature-x', '2026-04-10T00:00:00Z')
    deployment.pullRequest = {
      number: 42,
      title: 'Add feature X',
      url: 'https://github.com/flexion/forms-lab/pull/42',
      status: 'open',
    }
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('#42')
    expect(html).toContain(
      'href="https://github.com/flexion/forms-lab/pull/42"',
    )
    expect(html).toContain('open')
  })

  it('renders health error in detail section', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    deployment.health.status = 'unhealthy'
    deployment.health.error = 'HTTP 502 Bad Gateway'
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('Health error')
    expect(html).toContain('HTTP 502 Bad Gateway')
  })

  it('renders multiple deployments as multiple rows', () => {
    const d1 = makeDeployment('branch-a', '2026-04-10T00:00:00Z')
    const d2 = makeDeployment('branch-b', '2026-04-09T00:00:00Z')
    const html = DeploymentTable({ deployments: [d1, d2] })?.toString() ?? ''

    expect(html).toContain('branch-a')
    expect(html).toContain('branch-b')
  })

  it('root element has l-feature and deployment-table classes when populated', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html =
      DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('class="l-feature deployment-table"')
  })
})
