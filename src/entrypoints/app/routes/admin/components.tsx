import type { FC } from 'hono/jsx'
import type { AccessEntry } from '../../../../services/auth'
import { resolveUrl } from '../../../../shared/base-path'

interface EnrichedEntry extends AccessEntry {
  name: string
  avatarUrl: string | null
}

export const AdminUsersPage: FC<{
  pending: EnrichedEntry[]
  approved: EnrichedEntry[]
  revoked: EnrichedEntry[]
}> = ({ pending, approved, revoked }) => (
  <div class="l-stack" data-space="lg">
    <h1>User Management</h1>

    <section class="l-stack">
      <h2>Pending Requests ({pending.length})</h2>
      {pending.length === 0 ? (
        <p class="text-muted">No pending requests.</p>
      ) : (
        <table class="flex-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Requested</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((u) => (
              <tr>
                <td>
                  <div
                    class="l-cluster"
                    style="gap: var(--flex-space-xs); align-items: center;"
                  >
                    {u.avatarUrl && (
                      <img
                        src={u.avatarUrl}
                        alt=""
                        width="24"
                        height="24"
                        style="border-radius: 50%;"
                      />
                    )}
                    <span>
                      {u.name} (@{u.login})
                    </span>
                  </div>
                </td>
                <td>
                  {u.requestedAt
                    ? new Date(u.requestedAt * 1000).toLocaleDateString()
                    : '\u2014'}
                </td>
                <td>
                  <div class="l-cluster" style="gap: var(--flex-space-xs);">
                    <form
                      method="post"
                      action={resolveUrl('/admin/users/approve')}
                    >
                      <input type="hidden" name="login" value={u.login} />
                      <button type="submit" class="flex-button flex-button--sm">
                        Approve
                      </button>
                    </form>
                    <form
                      method="post"
                      action={resolveUrl('/admin/users/deny')}
                    >
                      <input type="hidden" name="login" value={u.login} />
                      <button
                        type="submit"
                        class="flex-button flex-button--sm flex-button--outline"
                      >
                        Deny
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>

    <section class="l-stack">
      <h2>Approved Users ({approved.length})</h2>
      {approved.length === 0 ? (
        <p class="text-muted">No approved users.</p>
      ) : (
        <table class="flex-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Source</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {approved.map((u) => (
              <tr>
                <td>
                  <div
                    class="l-cluster"
                    style="gap: var(--flex-space-xs); align-items: center;"
                  >
                    {u.avatarUrl && (
                      <img
                        src={u.avatarUrl}
                        alt=""
                        width="24"
                        height="24"
                        style="border-radius: 50%;"
                      />
                    )}
                    <span>
                      {u.name} (@{u.login})
                    </span>
                  </div>
                </td>
                <td>{u.source}</td>
                <td>
                  {u.source === 'env' ? (
                    <em class="text-muted">env-managed</em>
                  ) : (
                    <form
                      method="post"
                      action={resolveUrl('/admin/users/revoke')}
                    >
                      <input type="hidden" name="login" value={u.login} />
                      <button
                        type="submit"
                        class="flex-button flex-button--sm flex-button--outline"
                      >
                        Revoke
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>

    <section class="l-stack">
      <h2>Add User</h2>
      <form
        method="post"
        action={resolveUrl('/admin/users/add')}
        class="l-cluster"
        style="gap: var(--flex-space-sm);"
      >
        <input
          type="text"
          name="login"
          placeholder="GitHub username"
          required
          class="flex-input"
        />
        <button type="submit" class="flex-button">
          Add
        </button>
      </form>
    </section>

    {revoked.length > 0 && (
      <section class="l-stack">
        <h2>Revoked ({revoked.length})</h2>
        <table class="flex-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Revoked by</th>
            </tr>
          </thead>
          <tbody>
            {revoked.map((u) => (
              <tr>
                <td>
                  <div
                    class="l-cluster"
                    style="gap: var(--flex-space-xs); align-items: center;"
                  >
                    {u.avatarUrl && (
                      <img
                        src={u.avatarUrl}
                        alt=""
                        width="24"
                        height="24"
                        style="border-radius: 50%;"
                      />
                    )}
                    <span>
                      {u.name} (@{u.login})
                    </span>
                  </div>
                </td>
                <td>{u.decidedBy ?? '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}
  </div>
)
