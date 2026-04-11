import { describe, expect, it } from 'bun:test'
import {
  getCombinedHealthLabel,
  getCombinedHealthStatus,
  relativeTime,
} from '../src/app/components/deployment-table'
import { sortDeploymentsByDate } from '../src/services/deployment-metadata'
import type { DeploymentInfo } from '../src/types/deployment'

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
