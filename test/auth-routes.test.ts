import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import { sessionReader } from '../src/app/middleware/auth'
import authRoutes from '../src/app/routes/auth'
import type { GitHubUser } from '../src/lib/github-oauth'
import { COOKIE_NAME } from '../src/lib/session'

describe('Auth Routes', () => {
  let app: Hono
  let originalEnv: NodeJS.ProcessEnv
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    // Save original environment and fetch
    originalEnv = { ...process.env }
    originalFetch = global.fetch

    // Set up test environment
    process.env.GITHUB_CLIENT_ID = 'test_client_id'
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret'
    process.env.GITHUB_AUTHZ_ORG = 'flexion'
    process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

    // Create app
    app = new Hono()
    app.use('*', sessionReader())
    app.route('/auth', authRoutes)
  })

  afterEach(() => {
    // Restore original environment and fetch
    process.env = originalEnv
    global.fetch = originalFetch
  })

  describe('GET /auth/signin', () => {
    it('redirects to GitHub OAuth with correct parameters', async () => {
      const res = await app.request('/auth/signin')

      expect(res.status).toBe(302)
      const location = res.headers.get('Location')
      expect(location).toBeDefined()

      if (!location) throw new Error('Location header not set')
      const url = new URL(location)
      expect(url.origin).toBe('https://github.com')
      expect(url.pathname).toBe('/login/oauth/authorize')
      expect(url.searchParams.get('client_id')).toBe('test_client_id')
      expect(url.searchParams.get('scope')).toBe('read:user read:org')
      expect(url.searchParams.get('state')).toBeTruthy()
    })

    it('includes returnTo in state parameter', async () => {
      const res = await app.request('/auth/signin?returnTo=%2Fprojects')

      expect(res.status).toBe(302)
      const location = res.headers.get('Location')
      if (!location) throw new Error('Location header not set')
      const url = new URL(location)
      const state = url.searchParams.get('state')

      expect(state).toContain('returnTo')
    })
  })

  describe('GET /auth/callback', () => {
    it('creates session and redirects for authorized user', async () => {
      const mockUser: GitHubUser = {
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      }

      let _callCount = 0
      const mockFetch = mock(async (url: string | URL) => {
        _callCount++
        if (
          url.toString() === 'https://github.com/login/oauth/access_token' ||
          (typeof url === 'object' &&
            url.href === 'https://github.com/login/oauth/access_token')
        ) {
          return new Response(
            JSON.stringify({ access_token: 'gho_test_token' }),
            {
              status: 200,
            },
          )
        }
        if (
          url.toString() === 'https://api.github.com/user' ||
          (typeof url === 'object' &&
            url.href === 'https://api.github.com/user')
        ) {
          return new Response(JSON.stringify(mockUser), { status: 200 })
        }
        if (url.toString() === 'https://api.github.com/user/orgs') {
          return new Response(
            JSON.stringify([
              { login: 'flexion' },
              { login: 'other-org' },
            ]),
            { status: 200 },
          )
        }
        return new Response('', { status: 404 })
      })
      // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      global.fetch = mockFetch as any

      const state = encodeURIComponent(
        JSON.stringify({ returnTo: '/projects' }),
      )
      const res = await app.request(
        `/auth/callback?code=test_code&state=${state}`,
      )

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/projects')

      const cookie = res.headers.get('Set-Cookie')
      expect(cookie).toContain(COOKIE_NAME)
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('SameSite=Lax')
    })

    it('redirects to home with error for unauthorized user', async () => {
      const mockUser: GitHubUser = {
        login: 'unauthorized',
        name: 'Unauthorized User',
        avatar_url: 'https://example.com/avatar.png',
      }

      const mockFetch2 = mock(async (url: string | URL) => {
        if (
          url.toString() === 'https://github.com/login/oauth/access_token' ||
          (typeof url === 'object' &&
            url.href === 'https://github.com/login/oauth/access_token')
        ) {
          return new Response(
            JSON.stringify({ access_token: 'gho_test_token' }),
            {
              status: 200,
            },
          )
        }
        if (
          url.toString() === 'https://api.github.com/user' ||
          (typeof url === 'object' &&
            url.href === 'https://api.github.com/user')
        ) {
          return new Response(JSON.stringify(mockUser), { status: 200 })
        }
        if (url.toString() === 'https://api.github.com/user/orgs') {
          return new Response(
            JSON.stringify([
              { login: 'other-org' },
            ]),
            { status: 200 },
          )
        }
        return new Response('', { status: 404 })
      })
      // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      global.fetch = mockFetch2 as any

      const state = encodeURIComponent(
        JSON.stringify({ returnTo: '/projects' }),
      )
      const res = await app.request(
        `/auth/callback?code=test_code&state=${state}`,
      )

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/?error=unauthorized')

      const cookie = res.headers.get('Set-Cookie')
      expect(cookie).toBeNull()
    })

    it('redirects to root when returnTo is not specified', async () => {
      const mockUser: GitHubUser = {
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      }

      const mockFetch3 = mock(async (url: string | URL) => {
        if (
          url.toString() === 'https://github.com/login/oauth/access_token' ||
          (typeof url === 'object' &&
            url.href === 'https://github.com/login/oauth/access_token')
        ) {
          return new Response(
            JSON.stringify({ access_token: 'gho_test_token' }),
            {
              status: 200,
            },
          )
        }
        if (
          url.toString() === 'https://api.github.com/user' ||
          (typeof url === 'object' &&
            url.href === 'https://api.github.com/user')
        ) {
          return new Response(JSON.stringify(mockUser), { status: 200 })
        }
        if (url.toString() === 'https://api.github.com/user/orgs') {
          return new Response(
            JSON.stringify([
              { login: 'flexion' },
            ]),
            { status: 200 },
          )
        }
        return new Response('', { status: 404 })
      })
      // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      global.fetch = mockFetch3 as any

      const state = encodeURIComponent(JSON.stringify({}))
      const res = await app.request(
        `/auth/callback?code=test_code&state=${state}`,
      )

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/')
    })
  })

  describe('POST /auth/signout', () => {
    it('clears session cookie and redirects to home', async () => {
      const res = await app.request('/auth/signout', {
        method: 'POST',
      })

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/')

      const cookie = res.headers.get('Set-Cookie')
      expect(cookie).toContain(COOKIE_NAME)
      expect(cookie).toContain('Max-Age=0')
    })
  })
})
