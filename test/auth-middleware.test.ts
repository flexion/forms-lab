import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import {
  requireAuth,
  sessionReader,
} from '../src/entrypoints/app/middleware/auth'
import { COOKIE_NAME, encryptSession } from '../src/services/auth/session'

describe('Auth Middleware', () => {
  describe('sessionReader', () => {
    it('sets user context from valid session cookie', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret

      app.use('*', sessionReader())
      app.get('/test', (c) => {
        const user = c.get('user')
        return c.json({ user })
      })

      const sessionCookie = await encryptSession(
        {
          login: 'testuser',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.png',
        },
        secret,
      )

      const res = await app.request('/test', {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toEqual({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      })
    })

    it('sets user to null when no cookie present', async () => {
      const app = new Hono()
      process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

      app.use('*', sessionReader())
      app.get('/test', (c) => {
        const user = c.get('user')
        return c.json({ user })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeNull()
    })

    it('sets user to null for invalid cookie', async () => {
      const app = new Hono()
      process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

      app.use('*', sessionReader())
      app.get('/test', (c) => {
        const user = c.get('user')
        return c.json({ user })
      })

      const res = await app.request('/test', {
        headers: {
          Cookie: `${COOKIE_NAME}=invalid-encrypted-data`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('allows access when user is authenticated', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret

      app.use('*', sessionReader())
      app.use('/protected', requireAuth())
      app.get('/protected', (c) => c.text('success'))

      const sessionCookie = await encryptSession(
        {
          login: 'testuser',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.png',
        },
        secret,
      )

      const res = await app.request('/protected', {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`,
        },
      })

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('success')
    })

    it('redirects to signin when user is not authenticated', async () => {
      const app = new Hono()
      process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

      app.use('*', sessionReader())
      app.use('/protected', requireAuth())
      app.get('/protected', (c) => c.text('success'))

      const res = await app.request('/protected')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe(
        '/auth/signin?returnTo=%2Fprotected',
      )
    })

    it('preserves query string in returnTo parameter', async () => {
      const app = new Hono()
      process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

      app.use('*', sessionReader())
      app.use('/protected', requireAuth())
      app.get('/protected', (c) => c.text('success'))

      const res = await app.request('/protected?foo=bar&baz=qux')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe(
        '/auth/signin?returnTo=%2Fprotected%3Ffoo%3Dbar%26baz%3Dqux',
      )
    })
  })
})
