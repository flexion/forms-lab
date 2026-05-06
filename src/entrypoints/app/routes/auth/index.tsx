import { Hono } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import type { ActivityStore } from '../../../../services/activity'
import { Layout } from '../../../../design-system/components/flex-layout'
import type { AccessStore, UserStore } from '../../../../services/auth'
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  encryptSession,
  exchangeCodeForToken,
  fetchUserEmails,
  fetchUserProfile,
  hasAllowedEmailDomain,
} from '../../../../services/auth'
import { resolveUrl } from '../../../../shared/base-path'
import {
  AccessDeniedPage,
  AccessPendingPage,
  RequestAccessPage,
} from './components'

export function createAuthRoutes(
  userStore: UserStore,
  accessStore: AccessStore,
  options?: { activityStore?: ActivityStore },
): Hono {
  const auth = new Hono()

  /**
   * Get the external origin (scheme + host) from the request.
   * Behind a reverse proxy like Caddy, the internal request uses http://localhost,
   * so we check X-Forwarded-Proto and X-Forwarded-Host/Host headers.
   */
  function getExternalOrigin(c: {
    req: { header: (name: string) => string | undefined; url: string }
  }): string {
    const proto =
      c.req.header('x-forwarded-proto') ||
      new URL(c.req.url).protocol.replace(':', '')
    const host =
      c.req.header('x-forwarded-host') ||
      c.req.header('host') ||
      new URL(c.req.url).host
    return `${proto}://${host}`
  }

  // GET /auth/signin - Redirect to GitHub OAuth
  auth.get('/signin', (c) => {
    const clientId = process.env.GITHUB_CLIENT_ID
    if (!clientId) {
      return c.redirect(resolveUrl('/?error=config'))
    }

    const returnTo = c.req.query('returnTo') || resolveUrl('/')
    // Prevent open redirect — only allow internal paths
    const safeReturnTo =
      returnTo.startsWith('/') && !returnTo.startsWith('//')
        ? returnTo
        : resolveUrl('/')
    const state = JSON.stringify({ returnTo: safeReturnTo })

    // Build absolute callback URL from the current request so it works
    // under any base path (e.g., /main/auth/callback, /story-2/auth/callback)
    const callbackUrl = `${getExternalOrigin(c)}${resolveUrl('/auth/callback')}`

    const authUrl = new URL('https://github.com/login/oauth/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', callbackUrl)
    // `user:email` is required to check the user's verified email
    // domain against ALLOWED_EMAIL_DOMAINS; `read:org` remains for
    // the legacy org-membership path.
    authUrl.searchParams.set('scope', 'read:user read:org user:email')
    authUrl.searchParams.set('state', state)

    return c.redirect(authUrl.toString())
  })

  // GET /auth/callback - Handle OAuth callback
  auth.get('/callback', async (c) => {
    const code = c.req.query('code')
    const stateParam = c.req.query('state')

    if (!code || !stateParam) {
      return c.redirect(resolveUrl('/?error=invalid_request'))
    }

    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const sessionSecret = process.env.SESSION_SECRET

    if (!clientId || !clientSecret || !sessionSecret) {
      return c.redirect(resolveUrl('/?error=config'))
    }

    let state: { returnTo?: string }
    try {
      state = JSON.parse(stateParam)
    } catch {
      return c.redirect(resolveUrl('/?error=invalid_state'))
    }

    try {
      // Build callback URL to match what was sent during authorization
      const callbackUrl = `${getExternalOrigin(c)}${resolveUrl('/auth/callback')}`

      // Exchange code for token
      const token = await exchangeCodeForToken(
        code,
        clientId,
        clientSecret,
        callbackUrl,
      )

      // Fetch user profile
      const ghUser = await fetchUserProfile(token)

      // --- Three-layer authorization ---
      // Layer 1: env var bypass
      const allowedUsers = (process.env.ALLOWED_USERS ?? 'danielnaab')
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)

      if (allowedUsers.includes(ghUser.login)) {
        // Env-var user: auto-approve and record
        accessStore.setApproved(ghUser.login, 'env')
      } else {
        // Layer 2: domain bypass
        const allowedDomains = (
          process.env.ALLOWED_EMAIL_DOMAINS ?? 'flexion.us'
        )
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
        // Policy: flexion.us is always auto-approved regardless of config.
        // This is intentional — org users should never need manual approval.
        if (
          !allowedDomains.map((d) => d.toLowerCase()).includes('flexion.us')
        ) {
          allowedDomains.push('flexion.us')
        }

        const emails = await fetchUserEmails(token)
        if (hasAllowedEmailDomain(emails, allowedDomains)) {
          accessStore.setApproved(ghUser.login, 'domain')
        } else {
          // Layer 3: database lookup
          const entry = accessStore.get(ghUser.login)

          if (!entry) {
            // New external user — persist profile, set session so
            // request-access page knows who they are, redirect
            userStore.upsert({
              login: ghUser.login,
              name: ghUser.name ?? ghUser.login,
              avatarUrl: ghUser.avatar_url,
            })
            const sessionData = {
              login: ghUser.login,
              name: ghUser.name ?? ghUser.login,
              avatarUrl: ghUser.avatar_url,
            }
            const encryptedSession = await encryptSession(
              sessionData,
              sessionSecret,
            )
            setCookie(c, COOKIE_NAME, encryptedSession, {
              httpOnly: true,
              sameSite: 'Lax',
              maxAge: COOKIE_MAX_AGE,
              path: '/',
            })
            return c.redirect(resolveUrl('/auth/request-access'))
          }

          if (entry.status === 'pending') {
            return c.redirect(resolveUrl('/auth/access-pending'))
          }

          if (entry.status === 'revoked') {
            console.log(
              `Authorization denied for revoked user: ${ghUser.login}`,
            )
            return c.redirect(resolveUrl('/auth/access-denied'))
          }

          // entry.status === 'approved' — fall through to session creation
        }
      }

      // Persist user profile
      userStore.upsert({
        login: ghUser.login,
        name: ghUser.name ?? ghUser.login,
        avatarUrl: ghUser.avatar_url,
      })

      // Create session
      const sessionData = {
        login: ghUser.login,
        name: ghUser.name,
        avatarUrl: ghUser.avatar_url,
      }

      const encryptedSession = await encryptSession(sessionData, sessionSecret)

      setCookie(c, COOKIE_NAME, encryptedSession, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })

      options?.activityStore?.track({
        eventType: 'sign_in',
        userId: ghUser.login,
      })

      const returnTo = state.returnTo || resolveUrl('/')
      // Prevent open redirect — only allow internal paths
      const safeReturnTo =
        returnTo.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : resolveUrl('/')
      return c.redirect(safeReturnTo)
    } catch (error) {
      console.error('OAuth callback error:', error)
      return c.redirect(resolveUrl('/?error=auth_failed'))
    }
  })

  // POST /auth/signout - Clear session
  auth.post('/signout', (c) => {
    deleteCookie(c, COOKIE_NAME)
    return c.redirect(resolveUrl('/'))
  })

  // GET /auth/request-access — shows "request access" page
  auth.get('/request-access', (c) => {
    const user = c.get('user')
    return c.html(
      <Layout currentPath="/auth/request-access" user={user}>
        <RequestAccessPage user={user} />
      </Layout>,
    )
  })

  // POST /auth/request-access — records the request
  auth.post('/request-access', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.redirect(resolveUrl('/auth/signin'))
    }
    accessStore.requestAccess(user.login)

    // Fire notification (best-effort)
    try {
      const { notifyEvent } = await import('../../../../services/notifications')
      await notifyEvent({
        type: 'access.requested',
        title: `Access requested by @${user.login}`,
        status: 'info',
        details: `${user.name} (${user.login}) requested access to Forms Lab`,
        url: 'https://forms.labs.flexion.us/admin/users',
      })
    } catch {
      // Notification failure should not block the request
    }

    // Clear the temporary session — they don't have access yet
    deleteCookie(c, COOKIE_NAME)
    return c.redirect(resolveUrl('/auth/access-pending'))
  })

  // GET /auth/access-pending
  auth.get('/access-pending', (c) => {
    return c.html(
      <Layout currentPath="/auth/access-pending" user={null}>
        <AccessPendingPage />
      </Layout>,
    )
  })

  // GET /auth/access-denied
  auth.get('/access-denied', (c) => {
    return c.html(
      <Layout currentPath="/auth/access-denied" user={null}>
        <AccessDeniedPage />
      </Layout>,
    )
  })

  return auth
}
