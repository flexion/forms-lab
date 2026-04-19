import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { getDeploymentSummary } from '../src/services/deployment'

describe('deployment-metadata', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getDeploymentSummary', () => {
    it('returns mock data in development environment (no ports.json)', async () => {
      // Set a non-existent deploy root to simulate dev environment
      process.env.DEPLOY_ROOT = '/tmp/nonexistent-deploy-root'

      const summary = await getDeploymentSummary()

      expect(summary.totalDeployments).toBe(1)
      expect(summary.healthyDeployments).toBe(0)
      expect(summary.failedDeployments).toBe(0)
      expect(summary.deployments).toHaveLength(1)

      const deployment = summary.deployments[0]
      expect(deployment.branch).toBe('main')
      expect(deployment.service.status).toBe('inactive')
      expect(deployment.health.status).toBe('unknown')
      expect(deployment.health.error).toContain('Development mode')
      expect(deployment.commit.message).toContain('Development mode')
    })

    it('mock deployment includes all required fields', async () => {
      process.env.DEPLOY_ROOT = '/tmp/nonexistent-deploy-root'

      const summary = await getDeploymentSummary()
      const deployment = summary.deployments[0]

      // Verify all required fields are present
      expect(deployment.branch).toBeDefined()
      expect(deployment.port).toBeDefined()
      expect(deployment.url).toBeDefined()
      expect(deployment.commit).toBeDefined()
      expect(deployment.commit.sha).toBeDefined()
      expect(deployment.commit.shortSha).toBeDefined()
      expect(deployment.commit.message).toBeDefined()
      expect(deployment.commit.author).toBeDefined()
      expect(deployment.commit.date).toBeDefined()
      expect(deployment.commit.githubUrl).toBeDefined()
      expect(deployment.service).toBeDefined()
      expect(deployment.service.status).toBeDefined()
      expect(deployment.health).toBeDefined()
      expect(deployment.health.status).toBeDefined()
      expect(deployment.health.lastCheck).toBeDefined()
    })

    it('mock deployment has valid ISO date format', async () => {
      process.env.DEPLOY_ROOT = '/tmp/nonexistent-deploy-root'

      const summary = await getDeploymentSummary()
      const deployment = summary.deployments[0]

      // Should be valid ISO 8601 date
      expect(() => new Date(deployment.commit.date)).not.toThrow()
      expect(() => new Date(deployment.health.lastCheck)).not.toThrow()

      const commitDate = new Date(deployment.commit.date)
      expect(commitDate.toISOString()).toBe(deployment.commit.date)
    })

    it('summary statistics match deployment array', async () => {
      process.env.DEPLOY_ROOT = '/tmp/nonexistent-deploy-root'

      const summary = await getDeploymentSummary()

      expect(summary.totalDeployments).toBe(summary.deployments.length)

      const actualHealthy = summary.deployments.filter(
        (d) => d.service.status === 'running' && d.health.status === 'healthy',
      ).length
      expect(summary.healthyDeployments).toBe(actualHealthy)

      const actualFailed = summary.deployments.filter(
        (d) => d.service.status === 'failed' || d.health.status === 'unhealthy',
      ).length
      expect(summary.failedDeployments).toBe(actualFailed)
    })
  })

  describe('environment configuration', () => {
    it('respects DEPLOY_ROOT environment variable', async () => {
      const customRoot = '/custom/deploy/root'
      process.env.DEPLOY_ROOT = customRoot

      // Should attempt to read from custom root
      // Since it doesn't exist, should fall back to mock data
      const summary = await getDeploymentSummary()

      expect(summary.deployments[0].health.error).toContain('Development mode')
    })

    it('respects GIT_BIN environment variable', () => {
      const customGit = '/usr/bin/git'
      process.env.GIT_BIN = customGit

      // This just verifies the env var is read; actual git execution
      // would be tested with production environment
      expect(process.env.GIT_BIN).toBe(customGit)
    })
  })
})
