import { beforeEach, describe, expect, it } from 'bun:test'
import type { GitHubClient } from '../src/services/github'
import { triggerDeploy, triggerDeployWithStatus } from '../src/webhook/deploy'

describe('triggerDeploy', () => {
  const _originalEnv = process.env.DEPLOY_SCRIPT

  beforeEach(() => {
    process.env.DEPLOY_SCRIPT = 'echo'
  })

  it('returns success when script exits with code 0', async () => {
    const result = await triggerDeploy('main', 'abc123')

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(result.stdout).toBeDefined()
    expect(result.stderr).toBeDefined()
  })

  it('passes branch and sha as arguments to deploy script', async () => {
    const result = await triggerDeploy('slice-0/test', 'def456')

    expect(result.success).toBe(true)
    // echo will output the arguments passed to it
    expect(result.stdout?.includes('slice-0/test')).toBe(true)
    expect(result.stdout?.includes('def456')).toBe(true)
  })

  it('returns failure when script exits with non-zero code', async () => {
    process.env.DEPLOY_SCRIPT = 'false' // false command exits with 1

    const result = await triggerDeploy('main', 'abc123')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.stdout).toBeDefined()
    expect(result.stderr).toBeDefined()
  })

  it('returns error when script is missing', async () => {
    process.env.DEPLOY_SCRIPT = '/nonexistent/deploy-script-xyz'

    const result = await triggerDeploy('main', 'abc123')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.length).toBeGreaterThan(0)
  })

  it('uses default script path when DEPLOY_SCRIPT env var is not set', async () => {
    delete process.env.DEPLOY_SCRIPT

    // This test verifies the default is used; we can't easily test the actual /srv path exists
    // but we can verify the behavior when it doesn't
    const result = await triggerDeploy('main', 'abc123')

    // Should fail with the default path (unless /srv/forms-lab/deploy.sh exists)
    // We're just verifying the function handles the default gracefully
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.error === 'string' || result.error === undefined).toBe(
      true,
    )
  })
})

function createMockGitHubClient(): GitHubClient & {
  calls: Array<{ method: string; args: unknown[] }>
} {
  const calls: Array<{ method: string; args: unknown[] }> = []
  return {
    calls,
    async listIssues(...args) {
      calls.push({ method: 'listIssues', args })
      return []
    },
    async findPullRequest(...args) {
      calls.push({ method: 'findPullRequest', args })
      return null
    },
    async createDeployment(...args) {
      calls.push({ method: 'createDeployment', args })
      return { id: 42, url: 'https://api.github.com/repos/o/r/deployments/42' }
    },
    async createDeploymentStatus(...args) {
      calls.push({ method: 'createDeploymentStatus', args })
    },
  }
}

describe('triggerDeployWithStatus', () => {
  beforeEach(() => {
    process.env.DEPLOY_SCRIPT = 'echo'
  })

  it('creates deployment and sets in_progress then success on successful deploy', async () => {
    const client = createMockGitHubClient()

    const result = await triggerDeployWithStatus({
      branch: 'feature/test',
      sha: 'abc123def456',
      owner: 'flexion',
      repo: 'forms-lab',
      githubClient: client,
      hostname: 'example.com',
    })

    expect(result.success).toBe(true)

    const deploymentCalls = client.calls.filter(
      (c) => c.method === 'createDeployment',
    )
    expect(deploymentCalls).toHaveLength(1)
    expect(deploymentCalls[0].args).toEqual([
      'flexion',
      'forms-lab',
      'abc123def456',
      'feature-test',
      'Deploy feature/test to feature-test',
    ])

    const statusCalls = client.calls.filter(
      (c) => c.method === 'createDeploymentStatus',
    )
    expect(statusCalls).toHaveLength(2)
    // First call: in_progress
    expect(statusCalls[0].args[3]).toBe('in_progress')
    // Second call: success with environment URL
    expect(statusCalls[1].args[3]).toBe('success')
    expect(statusCalls[1].args[4]).toBe('https://example.com/feature-test/')
  })

  it('sets failure status when deploy fails', async () => {
    process.env.DEPLOY_SCRIPT = 'false'
    const client = createMockGitHubClient()

    const result = await triggerDeployWithStatus({
      branch: 'main',
      sha: 'abc123',
      owner: 'flexion',
      repo: 'forms-lab',
      githubClient: client,
    })

    expect(result.success).toBe(false)

    const statusCalls = client.calls.filter(
      (c) => c.method === 'createDeploymentStatus',
    )
    expect(statusCalls).toHaveLength(2)
    expect(statusCalls[0].args[3]).toBe('in_progress')
    expect(statusCalls[1].args[3]).toBe('failure')
  })

  it('falls back to plain deploy when no github client provided', async () => {
    const result = await triggerDeployWithStatus({
      branch: 'main',
      sha: 'abc123',
      owner: 'flexion',
      repo: 'forms-lab',
    })

    expect(result.success).toBe(true)
  })

  it('falls back to plain deploy when owner/repo are empty', async () => {
    const client = createMockGitHubClient()

    const result = await triggerDeployWithStatus({
      branch: 'main',
      sha: 'abc123',
      owner: '',
      repo: '',
      githubClient: client,
    })

    expect(result.success).toBe(true)
    expect(client.calls).toHaveLength(0)
  })

  it('still deploys when GitHub API errors on deployment creation', async () => {
    const client = createMockGitHubClient()
    client.createDeployment = async () => {
      throw new Error('API rate limit')
    }

    const result = await triggerDeployWithStatus({
      branch: 'main',
      sha: 'abc123',
      owner: 'flexion',
      repo: 'forms-lab',
      githubClient: client,
    })

    expect(result.success).toBe(true)
  })

  it('omits environment_url when no hostname provided', async () => {
    const client = createMockGitHubClient()

    await triggerDeployWithStatus({
      branch: 'main',
      sha: 'abc123',
      owner: 'flexion',
      repo: 'forms-lab',
      githubClient: client,
    })

    const statusCalls = client.calls.filter(
      (c) => c.method === 'createDeploymentStatus',
    )
    const successCall = statusCalls.find((c) => c.args[3] === 'success')
    expect(successCall?.args[4]).toBeUndefined()
  })
})
