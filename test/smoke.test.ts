/**
 * Smoke tests — verify the system is wired up correctly at the integration
 * level. These catch configuration and wiring issues (missing env vars,
 * unregistered routes, broken middleware chains) that unit tests miss.
 */
import { describe, expect, it } from 'bun:test'
import { demoFixtures, getFixture, loadFixturePdf } from '../fixtures/index'
import app from '../src/app/server'
import { COOKIE_NAME, encryptSession } from '../src/lib/session'

const SESSION_SECRET = 'test-secret-key-32-bytes-long!'

async function authenticatedRequest(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  process.env.SESSION_SECRET = SESSION_SECRET
  process.env.ALLOWED_USERS = 'testuser'
  const cookie = await encryptSession(
    {
      login: 'testuser',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    },
    SESSION_SECRET,
  )
  return app.request(path, {
    ...options,
    headers: {
      ...((options?.headers as Record<string, string>) ?? {}),
      Cookie: `${COOKIE_NAME}=${cookie}`,
    },
  })
}

describe('Smoke tests', () => {
  describe('Core routes respond', () => {
    it('GET / returns 200', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(200)
    })

    it('GET /health returns ok', async () => {
      const res = await app.request('/health')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe('ok')
    })

    it('GET /catalog returns 200', async () => {
      const res = await app.request('/catalog')
      expect(res.status).toBe(200)
    })
  })

  describe('Auth middleware is wired up', () => {
    it('GET /projects redirects unauthenticated users to signin', async () => {
      const res = await app.request('/projects')
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toContain('/auth/signin')
    })

    it('GET /projects returns 200 for authenticated users', async () => {
      const res = await authenticatedRequest('/projects')
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('My Projects')
    })
  })

  describe('Project creation flow', () => {
    it('GET /projects/new shows fixture cards and upload form', async () => {
      const res = await authenticatedRequest('/projects/new')
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('New Project')
      expect(html).toContain('pardon-application')
      expect(html).toContain('Upload your own PDF')
    })

    it('POST /projects with fixture creates a project and redirects', async () => {
      const res = await authenticatedRequest('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'fixture=pardon-application',
        redirect: 'manual',
      })
      expect(res.status).toBe(302)
      const location = res.headers.get('Location')
      expect(location).toMatch(/\/projects\/[a-f0-9-]+/)
    })

    it('GET /projects/:id shows project detail page', async () => {
      // Create a project first
      const createRes = await authenticatedRequest('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'fixture=pardon-application',
        redirect: 'manual',
      })
      const location = createRes.headers.get('Location') ?? ''
      const projectPath = location.startsWith('http')
        ? new URL(location).pathname
        : location

      const res = await authenticatedRequest(projectPath)
      expect(res.status).toBe(200)
      const html = await res.text()
      // Should show either extracting, ready, or error state
      expect(
        html.includes('Extracting form structure') ||
          html.includes('Extracted Data Requirements') ||
          html.includes('Extraction failed'),
      ).toBe(true)
    })
  })

  describe('Demo fixtures', () => {
    it('fixture manifest is non-empty', () => {
      expect(demoFixtures.length).toBeGreaterThan(0)
    })

    it('each fixture slug resolves via getFixture', () => {
      for (const f of demoFixtures) {
        expect(getFixture(f.slug)).toBeDefined()
      }
    })

    it('each fixture PDF file loads without error', () => {
      for (const f of demoFixtures) {
        const pdf = loadFixturePdf(f)
        expect(pdf.length).toBeGreaterThan(0)
      }
    })
  })

  describe('PDF extractor configuration', () => {
    it('BedrockPdfExtractor can be instantiated', async () => {
      const { createBedrockPdfExtractor } = await import(
        '../src/services/pdf-extractor'
      )
      // Should not throw — construction is lazy, no AWS calls yet
      const extractor = createBedrockPdfExtractor()
      expect(extractor).toBeDefined()
      expect(typeof extractor.extract).toBe('function')
    })

    it('AWS_REGION is set when required env vars are checked', () => {
      // This test documents the requirement — in production,
      // AWS_REGION must be set for Bedrock calls to succeed.
      // The deploy script must include it in the .env file.
      const region =
        process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? null
      if (process.env.CI || process.env.NODE_ENV === 'production') {
        expect(region).not.toBeNull()
      } else {
        // In local dev, warn but don't fail
        if (!region) {
          console.warn(
            'WARN: AWS_REGION not set — Bedrock extraction will fail at runtime',
          )
        }
      }
    })
  })
})
