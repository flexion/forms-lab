import { afterEach, describe, expect, it } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { Hono } from 'hono'
import { sessionReader } from '../src/entrypoints/app/middleware/auth'
import { createAdminRoutes } from '../src/entrypoints/app/routes/admin/index'
import {
  COOKIE_NAME,
  createAccessStore,
  createUserStore,
  encryptSession,
} from '../src/services/auth'

const TEST_DB = '/tmp/test-admin-routes.sqlite'
const SECRET = 'test-secret-key-32-bytes-long!'

function cleanup() {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      unlinkSync(`${TEST_DB}${suffix}`)
    } catch {
      /* ignore */
    }
  }
}

async function adminCookie() {
  return encryptSession(
    {
      login: 'adminuser',
      name: 'Admin',
      avatarUrl: 'https://example.com/a.png',
    },
    SECRET,
  )
}

async function regularCookie() {
  return encryptSession(
    {
      login: 'regular',
      name: 'Regular',
      avatarUrl: 'https://example.com/a.png',
    },
    SECRET,
  )
}

function buildApp() {
  const accessStore = createAccessStore(TEST_DB)
  const userStore = createUserStore(TEST_DB)
  const app = new Hono()
  process.env.SESSION_SECRET = SECRET
  process.env.ADMIN_USERS = 'adminuser'

  app.use('*', sessionReader())
  app.route('/admin', createAdminRoutes(accessStore, userStore))
  return { app, accessStore, userStore }
}

describe('Admin Routes', () => {
  afterEach(cleanup)

  it('GET /admin/users returns 403 for non-admin', async () => {
    const { app } = buildApp()
    const cookie = await regularCookie()
    const res = await app.request('/admin/users', {
      headers: { Cookie: `${COOKIE_NAME}=${cookie}` },
    })
    expect(res.status).toBe(403)
  })

  it('GET /admin/users returns 200 for admin', async () => {
    const { app } = buildApp()
    const cookie = await adminCookie()
    const res = await app.request('/admin/users', {
      headers: { Cookie: `${COOKIE_NAME}=${cookie}` },
    })
    expect(res.status).toBe(200)
  })

  it('POST /admin/users/approve approves a pending user', async () => {
    const { app, accessStore } = buildApp()
    accessStore.requestAccess('pendinguser')

    const cookie = await adminCookie()
    const res = await app.request('/admin/users/approve', {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_NAME}=${cookie}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'login=pendinguser',
    })

    expect(res.status).toBe(302)
    expect(accessStore.get('pendinguser')?.status).toBe('approved')
    expect(accessStore.get('pendinguser')?.decidedBy).toBe('adminuser')
  })

  it('POST /admin/users/deny denies a pending user', async () => {
    const { app, accessStore } = buildApp()
    accessStore.requestAccess('pendinguser')

    const cookie = await adminCookie()
    const res = await app.request('/admin/users/deny', {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_NAME}=${cookie}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'login=pendinguser',
    })

    expect(res.status).toBe(302)
    expect(accessStore.get('pendinguser')?.status).toBe('revoked')
  })

  it('POST /admin/users/revoke revokes an approved user', async () => {
    const { app, accessStore } = buildApp()
    accessStore.setApproved('approveduser', 'admin')

    const cookie = await adminCookie()
    const res = await app.request('/admin/users/revoke', {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_NAME}=${cookie}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'login=approveduser',
    })

    expect(res.status).toBe(302)
    expect(accessStore.get('approveduser')?.status).toBe('revoked')
  })

  it('POST /admin/users/add adds a new approved user', async () => {
    const { app, accessStore } = buildApp()

    const cookie = await adminCookie()
    const res = await app.request('/admin/users/add', {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_NAME}=${cookie}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'login=newuser',
    })

    expect(res.status).toBe(302)
    const entry = accessStore.get('newuser')
    expect(entry?.status).toBe('approved')
    expect(entry?.source).toBe('admin')
  })
})
