import { afterEach, describe, expect, it, mock } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { Hono } from 'hono'
import { sessionReader } from '../src/entrypoints/app/middleware/auth'
import { createAuthRoutes } from '../src/entrypoints/app/routes/auth/index'
import {
  type AccessStore,
  createAccessStore,
  createUserStore,
} from '../src/services/auth'

const TEST_DB = '/tmp/test-access-control.sqlite'

function cleanup() {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      unlinkSync(`${TEST_DB}${suffix}`)
    } catch {
      /* ignore */
    }
  }
}

function buildApp(accessStore: AccessStore) {
  const userStore = createUserStore(TEST_DB)
  const app = new Hono()
  process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'
  process.env.GITHUB_CLIENT_ID = 'test-client-id'
  process.env.GITHUB_CLIENT_SECRET = 'test-client-secret'
  app.use('*', sessionReader())
  app.route('/auth', createAuthRoutes(userStore, accessStore))
  return app
}

function mockGitHubApis(
  login: string,
  emails: Array<{ email: string; verified: boolean }>,
) {
  const responses: Response[] = [
    new Response(JSON.stringify({ access_token: 'gho_test' }), { status: 200 }),
    new Response(
      JSON.stringify({
        login,
        name: login,
        avatar_url: 'https://example.com/a.png',
      }),
      { status: 200 },
    ),
    new Response(
      JSON.stringify(
        emails.map((e) => ({
          ...e,
          primary: true,
          visibility: null,
        })),
      ),
      { status: 200 },
    ),
  ]
  let callIndex = 0
  // biome-ignore lint/suspicious/noExplicitAny: mock signature
  global.fetch = mock(() => Promise.resolve(responses[callIndex++])) as any
}

describe('OAuth callback authorization', () => {
  afterEach(() => {
    cleanup()
    delete process.env.ALLOWED_USERS
    delete process.env.ALLOWED_EMAIL_DOMAINS
  })

  it('auto-approves user in ALLOWED_USERS and records in access store', async () => {
    const accessStore = createAccessStore(TEST_DB)
    const app = buildApp(accessStore)
    process.env.ALLOWED_USERS = 'trusteduser'
    process.env.ALLOWED_EMAIL_DOMAINS = ''

    mockGitHubApis('trusteduser', [])

    const state = JSON.stringify({ returnTo: '/' })
    const res = await app.request(
      `/auth/callback?code=test&state=${encodeURIComponent(state)}`,
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/')

    const entry = accessStore.get('trusteduser')
    expect(entry?.status).toBe('approved')
    expect(entry?.source).toBe('env')
  })

  it('auto-approves user with flexion.us email and records in access store', async () => {
    const accessStore = createAccessStore(TEST_DB)
    const app = buildApp(accessStore)
    process.env.ALLOWED_USERS = ''
    process.env.ALLOWED_EMAIL_DOMAINS = 'flexion.us'

    mockGitHubApis('flexionuser', [
      { email: 'user@flexion.us', verified: true },
    ])

    const state = JSON.stringify({ returnTo: '/' })
    const res = await app.request(
      `/auth/callback?code=test&state=${encodeURIComponent(state)}`,
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/')

    const entry = accessStore.get('flexionuser')
    expect(entry?.status).toBe('approved')
    expect(entry?.source).toBe('domain')
  })

  it('redirects to request-access for unknown external user', async () => {
    const accessStore = createAccessStore(TEST_DB)
    const app = buildApp(accessStore)
    process.env.ALLOWED_USERS = ''
    process.env.ALLOWED_EMAIL_DOMAINS = 'flexion.us'

    mockGitHubApis('outsider', [
      { email: 'outsider@gmail.com', verified: true },
    ])

    const state = JSON.stringify({ returnTo: '/' })
    const res = await app.request(
      `/auth/callback?code=test&state=${encodeURIComponent(state)}`,
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/request-access')
  })

  it('redirects to access-pending for user with pending status', async () => {
    const accessStore = createAccessStore(TEST_DB)
    accessStore.requestAccess('pendinguser')
    const app = buildApp(accessStore)
    process.env.ALLOWED_USERS = ''
    process.env.ALLOWED_EMAIL_DOMAINS = 'flexion.us'

    mockGitHubApis('pendinguser', [
      { email: 'pending@gmail.com', verified: true },
    ])

    const state = JSON.stringify({ returnTo: '/' })
    const res = await app.request(
      `/auth/callback?code=test&state=${encodeURIComponent(state)}`,
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/access-pending')
  })

  it('redirects to access-denied for revoked user', async () => {
    const accessStore = createAccessStore(TEST_DB)
    accessStore.setApproved('baduser', 'admin')
    accessStore.revoke('baduser', 'admin1')
    const app = buildApp(accessStore)
    process.env.ALLOWED_USERS = ''
    process.env.ALLOWED_EMAIL_DOMAINS = 'flexion.us'

    mockGitHubApis('baduser', [{ email: 'bad@gmail.com', verified: true }])

    const state = JSON.stringify({ returnTo: '/' })
    const res = await app.request(
      `/auth/callback?code=test&state=${encodeURIComponent(state)}`,
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/access-denied')
  })

  it('allows previously-approved external user to sign in', async () => {
    const accessStore = createAccessStore(TEST_DB)
    accessStore.setApproved('approvedext', 'admin')
    const app = buildApp(accessStore)
    process.env.ALLOWED_USERS = ''
    process.env.ALLOWED_EMAIL_DOMAINS = 'flexion.us'

    mockGitHubApis('approvedext', [{ email: 'ext@gmail.com', verified: true }])

    const state = JSON.stringify({ returnTo: '/' })
    const res = await app.request(
      `/auth/callback?code=test&state=${encodeURIComponent(state)}`,
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/')
  })
})
