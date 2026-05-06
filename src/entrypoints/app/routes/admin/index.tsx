import { Hono } from 'hono'
import { Layout } from '../../../../design-system/components/flex-layout'
import type { AccessStore, UserStore } from '../../../../services/auth'
import { resolveUrl } from '../../../../shared/base-path'
import { requireAdmin } from '../../middleware/auth'
import { AdminUsersPage } from './components'

export function createAdminRoutes(
  accessStore: AccessStore,
  userStore: UserStore,
): Hono {
  const admin = new Hono()

  // All admin routes require admin
  admin.use('*', requireAdmin())

  // GET /admin/users — admin dashboard
  admin.get('/users', (c) => {
    const pending = accessStore.listByStatus('pending')
    const approved = accessStore.listByStatus('approved')
    const revoked = accessStore.listByStatus('revoked')

    const enriched = (entries: typeof pending) =>
      entries.map((entry) => {
        const profile = userStore.get(entry.login)
        return {
          ...entry,
          name: profile?.name ?? entry.login,
          avatarUrl: profile?.avatarUrl ?? null,
        }
      })

    const pendingUsers = enriched(pending)
    const approvedUsers = enriched(approved)
    const revokedUsers = enriched(revoked)

    return c.html(
      <Layout currentPath="/admin/users" user={c.get('user')}>
        <AdminUsersPage
          pending={pendingUsers}
          approved={approvedUsers}
          revoked={revokedUsers}
        />
      </Layout>,
    )
  })

  // POST /admin/users/approve
  admin.post('/users/approve', async (c) => {
    const body = await c.req.parseBody()
    const login = String(body.login ?? '').trim()
    const user = c.get('user')
    if (login && user) {
      accessStore.approve(login, user.login)
    }
    return c.redirect(resolveUrl('/admin/users'))
  })

  // POST /admin/users/deny
  admin.post('/users/deny', async (c) => {
    const body = await c.req.parseBody()
    const login = String(body.login ?? '').trim()
    const user = c.get('user')
    if (login && user) {
      accessStore.deny(login, user.login)
    }
    return c.redirect(resolveUrl('/admin/users'))
  })

  // POST /admin/users/revoke
  admin.post('/users/revoke', async (c) => {
    const body = await c.req.parseBody()
    const login = String(body.login ?? '').trim()
    const user = c.get('user')
    if (login && user) {
      accessStore.revoke(login, user.login)
    }
    return c.redirect(resolveUrl('/admin/users'))
  })

  // POST /admin/users/add
  admin.post('/users/add', async (c) => {
    const body = await c.req.parseBody()
    const login = String(body.login ?? '').trim()
    if (login) {
      accessStore.setApproved(login, 'admin')
    }
    return c.redirect(resolveUrl('/admin/users'))
  })

  return admin
}
