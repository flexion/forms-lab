import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { requireAuth, sessionReader } from '../src/app/middleware/auth'
import projectsRoutes from '../src/app/routes/projects/index.tsx'
import { COOKIE_NAME, encryptSession } from '../src/lib/session'

describe('Projects Routes', () => {
  it('renders projects page for authenticated user', async () => {
    const app = new Hono()
    const secret = 'test-secret-key-32-bytes-long!'
    process.env.SESSION_SECRET = secret

    app.use('*', sessionReader())
    app.use('/projects/*', requireAuth())
    app.route('/projects', projectsRoutes)

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
    expect(html).toContain('Test User')
  })

  it('redirects unauthenticated user to signin', async () => {
    const app = new Hono()
    process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

    app.use('*', sessionReader())
    app.use('/projects/*', requireAuth())
    app.route('/projects', projectsRoutes)

    const res = await app.request('/projects')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/signin')
  })
})
