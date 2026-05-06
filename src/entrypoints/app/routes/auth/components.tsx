import type { FC } from 'hono/jsx'
import type { SessionUser } from '../../../../services/auth'
import { resolveUrl } from '../../../../shared/base-path'

export const RequestAccessPage: FC<{ user: SessionUser | null }> = ({
  user,
}) => (
  <div
    class="l-stack"
    data-space="lg"
    style="max-width: 40rem; margin: 0 auto; padding: var(--flex-space-2xl) var(--flex-space-lg);"
  >
    <h1>Request Access to Forms Lab</h1>
    {user && (
      <p>
        Signed in as <strong>@{user.login}</strong>
      </p>
    )}
    <p>
      You don't currently have access to Forms Lab. Click below to request
      access from an administrator.
    </p>
    <form method="post" action={resolveUrl('/auth/request-access')}>
      <button type="submit" class="flex-button">
        Request Access
      </button>
    </form>
  </div>
)

export const AccessPendingPage: FC = () => (
  <div
    class="l-stack"
    data-space="lg"
    style="max-width: 40rem; margin: 0 auto; padding: var(--flex-space-2xl) var(--flex-space-lg);"
  >
    <h1>Access Request Pending</h1>
    <p>Your request is being reviewed. You'll be notified when approved.</p>
    <p>
      <a href={resolveUrl('/')}>Back to home</a>
    </p>
  </div>
)

export const AccessDeniedPage: FC = () => (
  <div
    class="l-stack"
    data-space="lg"
    style="max-width: 40rem; margin: 0 auto; padding: var(--flex-space-2xl) var(--flex-space-lg);"
  >
    <h1>Access Denied</h1>
    <p>
      Your access has been revoked. Contact an administrator for assistance.
    </p>
    <p>
      <a href={resolveUrl('/')}>Back to home</a>
    </p>
  </div>
)
