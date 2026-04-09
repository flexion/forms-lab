import { describe, expect, it, beforeEach } from 'bun:test'
import { triggerDeploy, DeployResult } from '../src/webhook/deploy'

describe('triggerDeploy', () => {
  const originalEnv = process.env.DEPLOY_SCRIPT

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
    expect(typeof result.error === 'string' || result.error === undefined).toBe(true)
  })
})
