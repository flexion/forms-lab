import { afterEach, describe, expect, it } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { Hono } from 'hono'
import {
  requireAdmin,
  requireAuth,
  sessionReader,
} from '../src/entrypoints/app/middleware/auth'
import {
  COOKIE_NAME,
  createAccessStore,
  encryptSession,
} from '../src/services/auth'

const TEST_DB = '/tmp/test-auth-middleware-access.sqlite'

afterEach(() => {
  try {
    unlinkSync(TEST_DB)
  } catch {
    // file may not exist, ignore
  }
})

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

  describe('requireAuth with access store', () => {
    it('clears session and redirects when user access is revoked', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret

      const store = createAccessStore(TEST_DB)
      store.requestAccess('revokeduser')
      store.approve('revokeduser', 'admin')
      store.revoke('revokeduser', 'admin')

      app.use('*', sessionReader())
      app.use('/protected', requireAuth(store))
      app.get('/protected', (c) => c.text('success'))

      const sessionCookie = await encryptSession(
        {
          login: 'revokeduser',
          name: 'Revoked User',
          avatarUrl: 'https://example.com/avatar.png',
        },
        secret,
      )

      const res = await app.request('/protected', {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`,
        },
      })

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toContain('/auth/signin')
    })

    it('allows access when user is approved', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret

      const store = createAccessStore(TEST_DB)
      store.setApproved('approveduser', 'domain')

      app.use('*', sessionReader())
      app.use('/protected', requireAuth(store))
      app.get('/protected', (c) => c.text('success'))

      const sessionCookie = await encryptSession(
        {
          login: 'approveduser',
          name: 'Approved User',
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

    it('still works without access store (backward compat)', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret

      app.use('*', sessionReader())
      app.use('/protected', requireAuth())
      app.get('/protected', (c) => c.text('success'))

      const sessionCookie = await encryptSession(
        {
          login: 'anyuser',
          name: 'Any User',
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
  })

  describe('requireAdmin', () => {
    it('allows access for admin users', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret
      process.env.ADMIN_USERS = 'adminuser'

      app.use('*', sessionReader())
      app.use('/admin', requireAdmin())
      app.get('/admin', (c) => c.text('admin access'))

      const sessionCookie = await encryptSession(
        {
          login: 'adminuser',
          name: 'Admin User',
          avatarUrl: 'https://example.com/avatar.png',
        },
        secret,
      )

      const res = await app.request('/admin', {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`,
        },
      })

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('admin access')
    })

    it('returns 403 for non-admin users', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret
      process.env.ADMIN_USERS = 'adminuser'

      app.use('*', sessionReader())
      app.use('/admin', requireAdmin())
      app.get('/admin', (c) => c.text('admin access'))

      const sessionCookie = await encryptSession(
        {
          login: 'regularuser',
          name: 'Regular User',
          avatarUrl: 'https://example.com/avatar.png',
        },
        secret,
      )

      const res = await app.request('/admin', {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`,
        },
      })

      expect(res.status).toBe(403)
    })

    it('defaults ADMIN_USERS to danielnaab', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret
      delete process.env.ADMIN_USERS

      app.use('*', sessionReader())
      app.use('/admin', requireAdmin())
      app.get('/admin', (c) => c.text('admin access'))

      const sessionCookie = await encryptSession(
        {
          login: 'danielnaab',
          name: 'Daniel Naab',
          avatarUrl: 'https://example.com/avatar.png',
        },
        secret,
      )

      const res = await app.request('/admin', {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`,
        },
      })

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('admin access')
    })
  })
})
