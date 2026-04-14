import { Hono } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { resolveUrl } from '../../../lib/base-path'
import {
  exchangeCodeForToken,
  fetchUserProfile,
} from '../../../lib/github-oauth'
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  encryptSession,
} from '../../../lib/session'
import type { UserStore } from '../../../services/user-store'

export function createAuthRoutes(userStore: UserStore): Hono {
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

    const returnTo = c.req.query('returnTo') || '/'
    // Prevent open redirect — only allow internal paths
    const safeReturnTo =
      returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
    const state = JSON.stringify({ returnTo: safeReturnTo })

    // Build absolute callback URL from the current request so it works
    // under any base path (e.g., /main/auth/callback, /story-2/auth/callback)
    const callbackUrl = `${getExternalOrigin(c)}${resolveUrl('/auth/callback')}`

    const authUrl = new URL('https://github.com/login/oauth/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', callbackUrl)
    authUrl.searchParams.set('scope', 'read:user read:org')
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

      // TODO: Replace with org membership check once OAuth app is approved
      // Temporary allowlist for development
      const allowedUsers = (process.env.ALLOWED_USERS ?? 'danielnaab').split(
        ',',
      )
      if (!allowedUsers.includes(ghUser.login)) {
        console.log(`Authorization failed for user: ${ghUser.login}`)
        return c.redirect(resolveUrl('/?error=unauthorized'))
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
        sameSite: 'Lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })

      const returnTo = state.returnTo || resolveUrl('/')
      // Prevent open redirect — only allow internal paths
      const safeReturnTo =
        returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
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

  return auth
}
