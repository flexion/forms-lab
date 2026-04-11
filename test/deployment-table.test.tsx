import { describe, expect, it } from 'bun:test'
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
