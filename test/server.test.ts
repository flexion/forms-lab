import { describe, expect, it } from 'bun:test'
import app from '../src/entrypoints/app/server'
import { COOKIE_NAME, encryptSession } from '../src/services/auth'

describe('Server', () => {
  it('responds to health check', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('timestamp')
  })

  it('responds to root path', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.text()
    expect(body).toContain('Forms Lab')
  })
})

describe('Authentication', () => {
  it('mounts auth routes at /auth', async () => {
    process.env.GITHUB_CLIENT_ID = 'test_id'
    const res = await app.request('/auth/signin')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('github.com')
  })

  it('protects /new route', async () => {
    const res = await app.request('/new')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/signin')
  })

  it('allows authenticated access to dashboard', async () => {
    const secret = 'test-secret-key-32-bytes-long!'
    process.env.SESSION_SECRET = secret

    const sessionCookie = await encryptSession(
      {
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      },
      secret,
    )

    const res = await app.request('/', {
      headers: {
        Cookie: `${COOKIE_NAME}=${sessionCookie}`,
      },
    })

    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Recent projects')
  })

  it('shows Projects link in nav for authenticated users', async () => {
    const secret = 'test-secret-key-32-bytes-long!'
    process.env.SESSION_SECRET = secret
    const sessionCookie = await encryptSession(
      {
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      },
      secret,
    )
    const res = await app.request('/', {
      headers: { Cookie: `${COOKIE_NAME}=${sessionCookie}` },
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('flex-header__nav-link">Projects</a>')
  })

  it('does not show Projects link in header nav for unauthenticated users', async () => {
    const res = await app.request('/')
    const html = await res.text()
    expect(html).not.toContain('flex-header__nav-link">Projects</a>')
  })
})
