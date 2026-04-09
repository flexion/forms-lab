import { describe, expect, it } from 'bun:test'
import app from '../src/app/server'
import { COOKIE_NAME, encryptSession } from '../src/lib/session'

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

  it('protects /projects routes', async () => {
    const res = await app.request('/projects')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/signin')
  })

  it('allows authenticated access to /projects', async () => {
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

    const res = await app.request('/projects', {
      headers: {
        Cookie: `${COOKIE_NAME}=${sessionCookie}`,
      },
    })

    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('My Projects')
  })
})
