import { Hono } from 'hono'
import type { AccessStore, UserStore } from '../../../../services/auth'
import { resolveUrl } from '../../../../shared/base-path'
import { requireAdmin } from '../../middleware/auth'

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

    // Raw HTML for now — Task 5 will replace with JSX components
    return c.html(
      `<!DOCTYPE html>
      <html><head><title>User Management</title></head>
      <body>
        <h1>User Management</h1>

        <h2>Pending Requests (${pendingUsers.length})</h2>
        ${
          pendingUsers.length === 0
            ? '<p>No pending requests.</p>'
            : `
        <table>
          <thead><tr><th>User</th><th>Requested</th><th>Actions</th></tr></thead>
          <tbody>
            ${pendingUsers
              .map(
                (u) => `
              <tr>
                <td>${u.name} (@${u.login})</td>
                <td>${u.requestedAt ? new Date(u.requestedAt * 1000).toLocaleDateString() : '—'}</td>
                <td>
                  <form method="POST" action="${resolveUrl('/admin/users/approve')}" style="display:inline">
                    <input type="hidden" name="login" value="${u.login}" />
                    <button type="submit">Approve</button>
                  </form>
                  <form method="POST" action="${resolveUrl('/admin/users/deny')}" style="display:inline">
                    <input type="hidden" name="login" value="${u.login}" />
                    <button type="submit">Deny</button>
                  </form>
                </td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>`
        }

        <h2>Approved Users (${approvedUsers.length})</h2>
        ${
          approvedUsers.length === 0
            ? '<p>No approved users.</p>'
            : `
        <table>
          <thead><tr><th>User</th><th>Source</th><th>Actions</th></tr></thead>
          <tbody>
            ${approvedUsers
              .map(
                (u) => `
              <tr>
                <td>${u.name} (@${u.login})</td>
                <td>${u.source}</td>
                <td>
                  ${
                    u.source === 'env'
                      ? '<em>env-managed</em>'
                      : `
                  <form method="POST" action="${resolveUrl('/admin/users/revoke')}" style="display:inline">
                    <input type="hidden" name="login" value="${u.login}" />
                    <button type="submit">Revoke</button>
                  </form>`
                  }
                </td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>`
        }

        <h2>Add User</h2>
        <form method="POST" action="${resolveUrl('/admin/users/add')}">
          <input type="text" name="login" placeholder="GitHub username" required />
          <button type="submit">Add</button>
        </form>

        ${
          revokedUsers.length > 0
            ? `
        <h2>Revoked (${revokedUsers.length})</h2>
        <table>
          <thead><tr><th>User</th><th>Revoked by</th></tr></thead>
          <tbody>
            ${revokedUsers
              .map(
                (u) => `
              <tr>
                <td>${u.name} (@${u.login})</td>
                <td>${u.decidedBy ?? '—'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>`
            : ''
        }
      </body></html>`,
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
