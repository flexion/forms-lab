import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import {
  COOKIE_NAME,
  decryptSession,
  type SessionUser,
} from '../../../services/auth'
import { resolveUrl } from '../../../shared/base-path'

declare module 'hono' {
  interface ContextVariableMap {
    user: SessionUser | null
  }
}

export function sessionReader() {
  return createMiddleware(async (c, next) => {
    const secret = process.env.SESSION_SECRET
    if (!secret) {
      c.set('user', null)
      await next()
      return
    }

    const cookie = getCookie(c, COOKIE_NAME)
    if (!cookie) {
      c.set('user', null)
      await next()
      return
    }

    const user = await decryptSession(cookie, secret)
    c.set('user', user)
    await next()
  })
}

export function requireAuth() {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!user) {
      const fullPath =
        c.req.path +
        (c.req.url.includes('?') ? `?${c.req.url.split('?')[1]}` : '')
      const returnTo = encodeURIComponent(fullPath)
      return c.redirect(`${resolveUrl('/auth/signin')}?returnTo=${returnTo}`)
    }
    await next()
  })
}
