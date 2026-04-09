# Story 2: Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build GitHub OAuth sign-in with encrypted session cookies and auth middleware protecting `/projects/*` routes.

**Architecture:** Cookie-based sessions (encrypted, no server store), GitHub OAuth App (classic) for authentication, repo permission check for authorization, Hono middleware for session reading and route protection.

**Tech Stack:** Bun, Hono, Web Crypto API (built-in), GitHub REST API

---

## File Structure

**New files:**
- `src/lib/session.ts` — Cookie encryption/decryption, SessionUser type
- `src/lib/github-oauth.ts` — Token exchange, profile fetch, repo permission check
- `src/middleware/auth.ts` — Session reader + requireAuth guard
- `src/routes/auth/index.ts` — Sign-in, callback, sign-out routes
- `src/routes/projects/index.ts` — Placeholder "My Projects" page
- `src/commands/setup-oauth.ts` — CLI command to create OAuth app
- `test/session.test.ts` — Session library tests
- `test/github-oauth.test.ts` — GitHub OAuth library tests
- `test/auth-middleware.test.ts` — Middleware tests
- `test/auth-routes.test.ts` — Auth routes integration tests
- `test/projects-routes.test.ts` — Projects route tests

**Modified files:**
- `src/server.tsx` — Mount auth routes, apply middleware, pass user to Layout
- `src/components/flex-layout/index.tsx` — Add sign-in link / user identity display
- `src/cli.ts` — Register setup-oauth command

---

### Task 1: Session Library

**Files:**
- Create: `src/lib/session.ts`
- Test: `test/session.test.ts`

- [ ] **Step 1: Write failing test for cookie encryption round-trip**

```typescript
// test/session.test.ts
import { describe, expect, it } from 'bun:test'
import { encryptSession, decryptSession, type SessionUser } from '../src/lib/session'

describe('Session', () => {
  const secret = 'test-secret-key-32-bytes-long!'
  const user: SessionUser = {
    login: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
  }

  it('encrypts and decrypts session data', async () => {
    const encrypted = await encryptSession(user, secret)
    expect(typeof encrypted).toBe('string')
    expect(encrypted.length).toBeGreaterThan(0)

    const decrypted = await decryptSession(encrypted, secret)
    expect(decrypted).toEqual(user)
  })

  it('returns null for invalid encrypted data', async () => {
    const result = await decryptSession('invalid-data', secret)
    expect(result).toBeNull()
  })

  it('returns null for wrong secret', async () => {
    const encrypted = await encryptSession(user, secret)
    const result = await decryptSession(encrypted, 'wrong-secret')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/session.test.ts`  
Expected: FAIL with "Cannot find module '../src/lib/session'"

- [ ] **Step 3: Create session library with encryption**

```typescript
// src/lib/session.ts
export interface SessionUser {
  login: string
  name: string
  avatarUrl: string
}

export async function encryptSession(
  user: SessionUser,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(user))

  // Derive key from secret
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('forms-lab-session'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  )

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Base64 encode
  return btoa(String.fromCharCode(...combined))
}

export async function decryptSession(
  encrypted: string,
  secret: string,
): Promise<SessionUser | null> {
  try {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    // Base64 decode
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)

    // Derive key from secret
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('forms-lab-session'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    )

    const json = decoder.decode(decrypted)
    return JSON.parse(json) as SessionUser
  } catch {
    return null
  }
}

export const COOKIE_NAME = 'forms_lab_session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/session.test.ts`  
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts test/session.test.ts
git commit -m "feat(auth): add session cookie encryption"
```

---

### Task 2: GitHub OAuth Library

**Files:**
- Create: `src/lib/github-oauth.ts`
- Test: `test/github-oauth.test.ts`

- [ ] **Step 1: Write failing tests for GitHub OAuth functions**

```typescript
// test/github-oauth.test.ts
import { describe, expect, it, mock } from 'bun:test'
import {
  exchangeCodeForToken,
  fetchUserProfile,
  checkRepoPermission,
  type GitHubUser,
} from '../src/lib/github-oauth'

describe('GitHub OAuth', () => {
  describe('exchangeCodeForToken', () => {
    it('exchanges authorization code for access token', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ access_token: 'gho_test_token' }),
            { status: 200 },
          ),
        ),
      )
      global.fetch = mockFetch as any

      const token = await exchangeCodeForToken(
        'test_code',
        'client_id',
        'client_secret',
      )
      expect(token).toBe('gho_test_token')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('throws on failed token exchange', async () => {
      global.fetch = mock(() =>
        Promise.resolve(new Response('', { status: 400 })),
      ) as any

      await expect(
        exchangeCodeForToken('bad_code', 'client_id', 'client_secret'),
      ).rejects.toThrow('Failed to exchange code for token')
    })
  })

  describe('fetchUserProfile', () => {
    it('fetches user profile from GitHub API', async () => {
      const mockUser: GitHubUser = {
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      }

      global.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockUser), { status: 200 })),
      ) as any

      const user = await fetchUserProfile('gho_test_token')
      expect(user).toEqual(mockUser)
    })

    it('throws on failed profile fetch', async () => {
      global.fetch = mock(() =>
        Promise.resolve(new Response('', { status: 401 })),
      ) as any

      await expect(fetchUserProfile('bad_token')).rejects.toThrow(
        'Failed to fetch user profile',
      )
    })
  })

  describe('checkRepoPermission', () => {
    it('returns true for users with write permission', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ permission: 'admin' }),
            { status: 200 },
          ),
        ),
      ) as any

      const hasPermission = await checkRepoPermission(
        'gho_test_token',
        'testuser',
        'flexion/forms-lab',
      )
      expect(hasPermission).toBe(true)
    })

    it('returns true for write permission', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ permission: 'write' }),
            { status: 200 },
          ),
        ),
      ) as any

      const hasPermission = await checkRepoPermission(
        'gho_test_token',
        'testuser',
        'flexion/forms-lab',
      )
      expect(hasPermission).toBe(true)
    })

    it('returns false for users with only read permission', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ permission: 'read' }),
            { status: 200 },
          ),
        ),
      ) as any

      const hasPermission = await checkRepoPermission(
        'gho_test_token',
        'testuser',
        'flexion/forms-lab',
      )
      expect(hasPermission).toBe(false)
    })

    it('returns false for non-collaborators', async () => {
      global.fetch = mock(() =>
        Promise.resolve(new Response('', { status: 404 })),
      ) as any

      const hasPermission = await checkRepoPermission(
        'gho_test_token',
        'testuser',
        'flexion/forms-lab',
      )
      expect(hasPermission).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/github-oauth.test.ts`  
Expected: FAIL with "Cannot find module '../src/lib/github-oauth'"

- [ ] **Step 3: Implement GitHub OAuth library**

```typescript
// src/lib/github-oauth.ts
export interface GitHubUser {
  login: string
  name: string
  avatar_url: string
}

export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  const data = await response.json()
  return data.access_token
}

export async function fetchUserProfile(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return await response.json()
}

export async function checkRepoPermission(
  token: string,
  username: string,
  repo: string,
): Promise<boolean> {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/collaborators/${username}/permission`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    },
  )

  if (!response.ok) {
    return false
  }

  const data = await response.json()
  const permission = data.permission

  return permission === 'admin' || permission === 'write'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/github-oauth.test.ts`  
Expected: 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/github-oauth.ts test/github-oauth.test.ts
git commit -m "feat(auth): add GitHub OAuth API client"
```

---

### Task 3: Auth Middleware - Session Reader

**Files:**
- Create: `src/middleware/auth.ts`
- Test: `test/auth-middleware.test.ts`

- [ ] **Step 1: Write failing tests for session reader middleware**

```typescript
// test/auth-middleware.test.ts
import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sessionReader } from '../src/middleware/auth'
import { encryptSession, COOKIE_NAME } from '../src/lib/session'

describe('Auth Middleware', () => {
  describe('sessionReader', () => {
    it('sets user context from valid session cookie', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret

      app.use('*', sessionReader())
      app.get('/test', (c) => {
        const user = c.get('user')
        return c.json({ user })
      })

      const sessionCookie = await encryptSession(
        {
          login: 'testuser',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.png',
        },
        secret,
      )

      const res = await app.request('/test', {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toEqual({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      })
    })

    it('sets user to null when no cookie present', async () => {
      const app = new Hono()
      process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

      app.use('*', sessionReader())
      app.get('/test', (c) => {
        const user = c.get('user')
        return c.json({ user })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeNull()
    })

    it('sets user to null for invalid cookie', async () => {
      const app = new Hono()
      process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

      app.use('*', sessionReader())
      app.get('/test', (c) => {
        const user = c.get('user')
        return c.json({ user })
      })

      const res = await app.request('/test', {
        headers: {
          Cookie: `${COOKIE_NAME}=invalid-encrypted-data`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/auth-middleware.test.ts`  
Expected: FAIL with "Cannot find module '../src/middleware/auth'"

- [ ] **Step 3: Implement session reader middleware**

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { decryptSession, COOKIE_NAME, type SessionUser } from '../lib/session'

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/auth-middleware.test.ts`  
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/middleware/auth.ts test/auth-middleware.test.ts
git commit -m "feat(auth): add session reader middleware"
```

---

### Task 4: Auth Middleware - RequireAuth Guard

**Files:**
- Modify: `src/middleware/auth.ts`
- Test: `test/auth-middleware.test.ts`

- [ ] **Step 1: Add failing tests for requireAuth middleware**

```typescript
// Add to test/auth-middleware.test.ts after sessionReader tests
  describe('requireAuth', () => {
    it('allows authenticated users through', async () => {
      const app = new Hono()
      const secret = 'test-secret-key-32-bytes-long!'
      process.env.SESSION_SECRET = secret

      app.use('*', sessionReader())
      app.use('/protected/*', requireAuth())
      app.get('/protected/page', (c) => c.text('Protected content'))

      const sessionCookie = await encryptSession(
        {
          login: 'testuser',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.png',
        },
        secret,
      )

      const res = await app.request('/protected/page', {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`,
        },
      })

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('Protected content')
    })

    it('redirects unauthenticated users to signin', async () => {
      const app = new Hono()
      process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

      app.use('*', sessionReader())
      app.use('/protected/*', requireAuth())
      app.get('/protected/page', (c) => c.text('Protected content'))

      const res = await app.request('/protected/page')
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe(
        '/auth/signin?returnTo=%2Fprotected%2Fpage',
      )
    })

    it('preserves returnTo query param with special characters', async () => {
      const app = new Hono()
      process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'

      app.use('*', sessionReader())
      app.use('/protected/*', requireAuth())
      app.get('/protected/page', (c) => c.text('Protected content'))

      const res = await app.request('/protected/page?filter=test&sort=asc')
      expect(res.status).toBe(302)
      const location = res.headers.get('Location')
      expect(location).toContain('/auth/signin?returnTo=')
      expect(decodeURIComponent(location!)).toContain(
        '/protected/page?filter=test&sort=asc',
      )
    })
  })
```

Import requireAuth at the top:

```typescript
import { sessionReader, requireAuth } from '../src/middleware/auth'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/auth-middleware.test.ts`  
Expected: FAIL with "requireAuth is not exported"

- [ ] **Step 3: Add requireAuth middleware to auth.ts**

```typescript
// Add to src/middleware/auth.ts after sessionReader
export function requireAuth() {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!user) {
      const returnTo = encodeURIComponent(c.req.url.replace(c.req.raw.url.split('?')[0].replace(c.req.path, ''), ''))
      return c.redirect(`/auth/signin?returnTo=${returnTo}`)
    }
    await next()
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/auth-middleware.test.ts`  
Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/middleware/auth.ts test/auth-middleware.test.ts
git commit -m "feat(auth): add requireAuth guard middleware"
```

---

### Task 5: Auth Routes

**Files:**
- Create: `src/routes/auth/index.ts`
- Test: `test/auth-routes.test.ts`

- [ ] **Step 1: Write failing integration tests for auth routes**

```typescript
// test/auth-routes.test.ts
import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test'
import { Hono } from 'hono'
import { sessionReader } from '../src/middleware/auth'
import authRoutes from '../src/routes/auth'
import { COOKIE_NAME } from '../src/lib/session'

describe('Auth Routes', () => {
  let app: Hono
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    app = new Hono()
    process.env.SESSION_SECRET = 'test-secret-key-32-bytes-long!'
    process.env.GITHUB_CLIENT_ID = 'test_client_id'
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret'
    process.env.GITHUB_AUTHZ_REPO = 'flexion/forms-lab'

    app.use('*', sessionReader())
    app.route('/auth', authRoutes)

    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('GET /auth/signin', () => {
    it('redirects to GitHub OAuth authorization URL', async () => {
      const res = await app.request('/auth/signin')
      expect(res.status).toBe(302)

      const location = res.headers.get('Location')
      expect(location).toContain('https://github.com/login/oauth/authorize')
      expect(location).toContain('client_id=test_client_id')
      expect(location).toContain('scope=read:user')
    })

    it('preserves returnTo query parameter', async () => {
      const res = await app.request('/auth/signin?returnTo=%2Fprojects')
      expect(res.status).toBe(302)

      const location = res.headers.get('Location')
      expect(location).toContain('state=')
      const state = new URL(location!).searchParams.get('state')
      expect(state).toBeTruthy()
    })
  })

  describe('GET /auth/callback', () => {
    it('exchanges code for token and creates session for authorized user', async () => {
      global.fetch = mock((url: string) => {
        if (url === 'https://github.com/login/oauth/access_token') {
          return Promise.resolve(
            new Response(JSON.stringify({ access_token: 'gho_test' }), {
              status: 200,
            }),
          )
        }
        if (url === 'https://api.github.com/user') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                login: 'testuser',
                name: 'Test User',
                avatar_url: 'https://example.com/avatar.png',
              }),
              { status: 200 },
            ),
          )
        }
        if (
          url ===
          'https://api.github.com/repos/flexion/forms-lab/collaborators/testuser/permission'
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ permission: 'write' }), {
              status: 200,
            }),
          )
        }
        return Promise.resolve(new Response('', { status: 404 }))
      }) as any

      const res = await app.request('/auth/callback?code=test_code')
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/projects')

      const setCookie = res.headers.get('Set-Cookie')
      expect(setCookie).toContain(COOKIE_NAME)
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('SameSite=Lax')
    })

    it('redirects to / with error for unauthorized user', async () => {
      global.fetch = mock((url: string) => {
        if (url === 'https://github.com/login/oauth/access_token') {
          return Promise.resolve(
            new Response(JSON.stringify({ access_token: 'gho_test' }), {
              status: 200,
            }),
          )
        }
        if (url === 'https://api.github.com/user') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                login: 'unauthorized',
                name: 'Unauthorized User',
                avatar_url: 'https://example.com/avatar.png',
              }),
              { status: 200 },
            ),
          )
        }
        if (
          url ===
          'https://api.github.com/repos/flexion/forms-lab/collaborators/unauthorized/permission'
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ permission: 'read' }), { status: 200 }),
          )
        }
        return Promise.resolve(new Response('', { status: 404 }))
      }) as any

      const res = await app.request('/auth/callback?code=test_code')
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/?error=unauthorized')

      const setCookie = res.headers.get('Set-Cookie')
      expect(setCookie).toBeNull()
    })

    it('redirects to returnTo path after successful auth', async () => {
      global.fetch = mock((url: string) => {
        if (url === 'https://github.com/login/oauth/access_token') {
          return Promise.resolve(
            new Response(JSON.stringify({ access_token: 'gho_test' }), {
              status: 200,
            }),
          )
        }
        if (url === 'https://api.github.com/user') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                login: 'testuser',
                name: 'Test User',
                avatar_url: 'https://example.com/avatar.png',
              }),
              { status: 200 },
            ),
          )
        }
        if (
          url ===
          'https://api.github.com/repos/flexion/forms-lab/collaborators/testuser/permission'
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ permission: 'admin' }), {
              status: 200,
            }),
          )
        }
        return Promise.resolve(new Response('', { status: 404 }))
      }) as any

      const res = await app.request(
        '/auth/callback?code=test_code&state=%2Fprojects%2F123',
      )
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/projects/123')
    })
  })

  describe('POST /auth/signout', () => {
    it('clears session cookie and redirects to /', async () => {
      const res = await app.request('/auth/signout', { method: 'POST' })
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/')

      const setCookie = res.headers.get('Set-Cookie')
      expect(setCookie).toContain(COOKIE_NAME)
      expect(setCookie).toContain('Max-Age=0')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/auth-routes.test.ts`  
Expected: FAIL with "Cannot find module '../src/routes/auth'"

- [ ] **Step 3: Create auth routes**

```typescript
// src/routes/auth/index.ts
import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import {
  exchangeCodeForToken,
  fetchUserProfile,
  checkRepoPermission,
} from '../../lib/github-oauth'
import {
  encryptSession,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from '../../lib/session'

const auth = new Hono()

auth.get('/signin', (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return c.text('GitHub OAuth not configured', 500)
  }

  const returnTo = c.req.query('returnTo') || '/projects'
  const state = encodeURIComponent(returnTo)

  const authUrl = new URL('https://github.com/login/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('scope', 'read:user')
  authUrl.searchParams.set('state', state)

  return c.redirect(authUrl.toString())
})

auth.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const authzRepo = process.env.GITHUB_AUTHZ_REPO || 'flexion/forms-lab'

  if (!code || !clientId || !clientSecret) {
    return c.redirect('/?error=invalid_request')
  }

  try {
    // Exchange code for token
    const token = await exchangeCodeForToken(code, clientId, clientSecret)

    // Fetch user profile
    const githubUser = await fetchUserProfile(token)

    // Check repo permission
    const hasPermission = await checkRepoPermission(
      token,
      githubUser.login,
      authzRepo,
    )

    if (!hasPermission) {
      return c.redirect('/?error=unauthorized')
    }

    // Create session
    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret) {
      return c.redirect('/?error=server_error')
    }

    const sessionUser = {
      login: githubUser.login,
      name: githubUser.name,
      avatarUrl: githubUser.avatar_url,
    }

    const encryptedSession = await encryptSession(sessionUser, sessionSecret)

    setCookie(c, COOKIE_NAME, encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    const returnTo = state ? decodeURIComponent(state) : '/projects'
    return c.redirect(returnTo)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.redirect('/?error=auth_failed')
  }
})

auth.post('/signout', (c) => {
  deleteCookie(c, COOKIE_NAME, { path: '/' })
  return c.redirect('/')
})

export default auth
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/auth-routes.test.ts`  
Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/routes/auth/index.ts test/auth-routes.test.ts
git commit -m "feat(auth): add signin, callback, and signout routes"
```

---

### Task 6: Projects Route (Placeholder)

**Files:**
- Create: `src/routes/projects/index.ts`
- Test: `test/projects-routes.test.ts`

- [ ] **Step 1: Write failing test for projects route**

```typescript
// test/projects-routes.test.ts
import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sessionReader, requireAuth } from '../src/middleware/auth'
import projectsRoutes from '../src/routes/projects'
import { encryptSession, COOKIE_NAME } from '../src/lib/session'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/projects-routes.test.ts`  
Expected: FAIL with "Cannot find module '../src/routes/projects'"

- [ ] **Step 3: Create projects route with placeholder content**

```typescript
// src/routes/projects/index.ts
import { Hono } from 'hono'
import { Layout } from '../../components/flex-layout'

const projects = new Hono()

projects.get('/', (c) => {
  const user = c.get('user')

  return c.html(
    <Layout currentPath="/projects">
      <h1>My Projects</h1>
      <p>Welcome, {user?.name}!</p>
      <p>
        This is a placeholder. Project authoring functionality will be added in
        future stories.
      </p>
    </Layout>,
  )
})

export default projects
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/projects-routes.test.ts`  
Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/routes/projects/index.ts test/projects-routes.test.ts
git commit -m "feat(auth): add placeholder projects page"
```

---

### Task 7: Update server.tsx

**Files:**
- Modify: `src/server.tsx`

- [ ] **Step 1: Add failing integration test for server auth setup**

```typescript
// Add to test/server.test.ts
import { encryptSession, COOKIE_NAME } from '../src/lib/session'

// Add after existing tests
describe('Authentication', () => {
  it('mounts auth routes at /auth', async () => {
    process.env.GITHUB_CLIENT_ID = 'test_id'
    const res = await app.request('/auth/signin')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('github.com')
  })

  it('protects /projects routes', async () => {
    const res = await app.request('/projects')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/signin')
  })

  it('allows authenticated access to /projects', async () => {
    const secret = 'test-secret-key-32-bytes-long!'
    process.env.SESSION_SECRET = secret

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
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/server.test.ts`  
Expected: FAIL with various errors about missing routes and middleware

- [ ] **Step 3: Update server.tsx to mount auth routes and apply middleware**

```typescript
// Modify src/server.tsx
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { Layout } from './components/flex-layout'
import catalog from './routes/catalog/index'
import auth from './routes/auth/index'
import projects from './routes/projects/index'
import { sessionReader, requireAuth } from './middleware/auth'

const app = new Hono()

// Apply session reader globally
app.use('*', sessionReader())

// USWDS icon sprite
app.get('/static/sprite.svg', async (c) => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const svg = await readFile(
    resolve(process.cwd(), 'node_modules/@uswds/uswds/dist/img/sprite.svg'),
    'utf-8',
  )
  c.header('Content-Type', 'image/svg+xml')
  c.header('Cache-Control', 'public, max-age=31536000')
  return c.body(svg)
})

// USWDS images (flag, banner icons, etc.)
app.get('/static/img/:name', async (c) => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const name = c.req.param('name')
  // Only serve known USWDS image files
  const allowed = [
    'us_flag_small.png',
    'icon-dot-gov.svg',
    'icon-https.svg',
    'logo-img.png',
    'hero.jpg',
  ]
  if (!allowed.includes(name)) return c.notFound()
  const filePath = resolve(
    process.cwd(),
    `node_modules/@uswds/uswds/dist/img/${name}`,
  )
  try {
    const data = await readFile(filePath)
    const ext = name.split('.').pop()
    const contentType =
      ext === 'svg'
        ? 'image/svg+xml'
        : ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream'
    c.header('Content-Type', contentType)
    c.header('Cache-Control', 'public, max-age=31536000')
    return c.body(data)
  } catch {
    return c.notFound()
  }
})

// Font files (self-hosted, matching USWDS)
app.use(
  '/static/fonts/*',
  serveStatic({
    root: './src/public',
    rewriteRequestPath: (path) => path.replace('/static/', ''),
  }),
)

// Static assets (CSS + JS build output)
app.use(
  '/static/*',
  serveStatic({
    root: './dist',
    rewriteRequestPath: (path) => path.replace('/static', ''),
  }),
)

// Mount auth routes
app.route('/auth', auth)

// Mount projects routes with auth guard
app.use('/projects/*', requireAuth())
app.route('/projects', projects)

// Mount catalog routes
app.route('/catalog', catalog)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Root page
app.get('/', (c) => {
  return c.html(
    <Layout currentPath="/">
      <h1>Forms Lab</h1>
      <p>
        Upload a government PDF form, extract structured specs, deliver form
        experiences (static or conversational), and generate completed PDFs.
      </p>
      <p>
        <a href="/catalog">Browse the Catalog</a>
      </p>
    </Layout>,
  )
})

export default app
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/server.test.ts`  
Expected: All tests pass (including new auth tests)

- [ ] **Step 5: Commit**

```bash
git add src/server.tsx test/server.test.ts
git commit -m "feat(auth): mount auth routes and apply middleware"
```

---

### Task 8: Update Layout Component

**Files:**
- Modify: `src/components/flex-layout/index.tsx`

- [ ] **Step 1: Read current Layout component**

Run: `cat src/components/flex-layout/index.tsx | head -100`  
Note: Review the structure to understand where to add the user display

- [ ] **Step 2: Add test for Layout with user context**

```typescript
// Add to test file that tests flex-layout, or create test/flex-layout.test.ts
import { describe, expect, it } from 'bun:test'
import { Layout } from '../src/components/flex-layout'

describe('Layout with auth', () => {
  it('renders sign-in link when no user', () => {
    const html = (
      <Layout currentPath="/">
        <p>Content</p>
      </Layout>
    ).toString()

    expect(html).toContain('Sign in')
    expect(html).toContain('/auth/signin')
  })

  it('renders user identity when signed in', () => {
    // Note: This requires modifying Layout to accept user prop
    const html = (
      <Layout
        currentPath="/"
        user={{
          login: 'testuser',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.png',
        }}
      >
        <p>Content</p>
      </Layout>
    ).toString()

    expect(html).toContain('Test User')
    expect(html).toContain('https://example.com/avatar.png')
    expect(html).toContain('Sign out')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test test/flex-layout.test.ts` (or appropriate test file)  
Expected: FAIL - Layout doesn't accept user prop

- [ ] **Step 4: Update Layout to accept and display user**

Modify `src/components/flex-layout/index.tsx`:

1. Add SessionUser import and user prop:

```typescript
import type { SessionUser } from '../../lib/session'

export function Layout({
  currentPath,
  user,
  children,
}: {
  currentPath: string
  user?: SessionUser | null
  children: JSX.Element | JSX.Element[]
}) {
```

2. Add user section in the header (find the appropriate location in the header component):

```tsx
{/* Add after main navigation, before closing header tag */}
<div class="usa-nav__secondary">
  <ul class="usa-nav__secondary-links">
    {user ? (
      <li class="usa-nav__secondary-item">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <img
            src={user.avatarUrl}
            alt={user.name}
            width="32"
            height="32"
            style="border-radius: 50%;"
          />
          <span>{user.name}</span>
          <form method="POST" action="/auth/signout" style="margin: 0;">
            <button
              type="submit"
              class="usa-button usa-button--unstyled"
              style="padding: 0.5rem;"
            >
              Sign out
            </button>
          </form>
        </div>
      </li>
    ) : (
      <li class="usa-nav__secondary-item">
        <a href="/auth/signin" class="usa-button usa-button--outline">
          Sign in
        </a>
      </li>
    )}
  </ul>
</div>
```

- [ ] **Step 5: Update all Layout usages to pass user**

Update `src/server.tsx` to pass user to Layout:

```typescript
// In the root route:
app.get('/', (c) => {
  const user = c.get('user')
  return c.html(
    <Layout currentPath="/" user={user}>
      <h1>Forms Lab</h1>
      <p>
        Upload a government PDF form, extract structured specs, deliver form
        experiences (static or conversational), and generate completed PDFs.
      </p>
      <p>
        <a href="/catalog">Browse the Catalog</a>
      </p>
    </Layout>,
  )
})
```

Update `src/routes/projects/index.ts`:

```typescript
projects.get('/', (c) => {
  const user = c.get('user')

  return c.html(
    <Layout currentPath="/projects" user={user}>
      <h1>My Projects</h1>
      <p>Welcome, {user?.name}!</p>
      <p>
        This is a placeholder. Project authoring functionality will be added in
        future stories.
      </p>
    </Layout>,
  )
})
```

Note: You will need to update all catalog routes similarly. For brevity, update them all to pass `user={c.get('user')}` to Layout.

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test test/flex-layout.test.ts`  
Expected: Tests pass

- [ ] **Step 7: Run all tests to ensure nothing broke**

Run: `bun test`  
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/components/flex-layout/index.tsx src/server.tsx src/routes/projects/index.ts test/flex-layout.test.ts
git commit -m "feat(auth): add user display to header"
```

Note: Catalog route updates can be done in a follow-up commit if there are many files to update.

---

### Task 9: CLI Setup OAuth Command

**Files:**
- Create: `src/commands/setup-oauth.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Create setup-oauth command**

```typescript
// src/commands/setup-oauth.ts
import { randomBytes } from 'node:crypto'
import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'

interface OAuthAppResponse {
  client_id: string
  client_secret: string
}

export async function setupOAuth() {
  console.log('Setting up GitHub OAuth App...\n')

  // Prompt for callback URL
  const defaultCallback = 'http://localhost:3000/auth/callback'
  console.log(`Callback URL (default: ${defaultCallback}):`)
  // For now, use default - Bun doesn't have built-in prompts
  const callbackUrl = defaultCallback

  console.log(`Using callback URL: ${callbackUrl}\n`)

  // Create OAuth app via GitHub API
  console.log('Creating OAuth App on GitHub...')

  const response = await fetch('https://api.github.com/user/apps', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      Authorization: `token ${process.env.GITHUB_TOKEN || ''}`,
    },
    body: JSON.stringify({
      name: 'Forms Lab (dev)',
      url: 'http://localhost:3000',
      callback_url: callbackUrl,
      description: 'Forms Lab development OAuth app',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to create OAuth app:', error)
    console.error(
      '\nMake sure you have GITHUB_TOKEN environment variable set with a token that has admin:oauth_app scope.',
    )
    console.error(
      'Or create the OAuth app manually at https://github.com/settings/developers',
    )
    process.exit(1)
  }

  const app = (await response.json()) as OAuthAppResponse

  console.log(`Created OAuth App with client ID: ${app.client_id}\n`)

  // Update .env file
  const envPath = resolve(process.cwd(), '.env')
  let envContent = ''
  try {
    envContent = await readFile(envPath, 'utf-8')
  } catch {
    // .env doesn't exist yet
  }

  const updates: string[] = []

  if (!envContent.includes('GITHUB_CLIENT_ID')) {
    updates.push(`GITHUB_CLIENT_ID=${app.client_id}`)
  }

  if (!envContent.includes('GITHUB_CLIENT_SECRET')) {
    updates.push(`GITHUB_CLIENT_SECRET=${app.client_secret}`)
  }

  if (!envContent.includes('SESSION_SECRET')) {
    const sessionSecret = randomBytes(32).toString('base64')
    updates.push(`SESSION_SECRET=${sessionSecret}`)
  }

  if (updates.length > 0) {
    const newContent = envContent
      ? `${envContent.trim()}\n${updates.join('\n')}\n`
      : `${updates.join('\n')}\n`
    await writeFile(envPath, newContent)
    console.log('Updated .env file with:')
    updates.forEach((line) => console.log(`  ${line.split('=')[0]}`))
  } else {
    console.log('.env file already contains all required variables')
  }

  console.log('\nOAuth setup complete!')
  console.log('You can now start the dev server with: bun run dev')
}
```

- [ ] **Step 2: Register command in CLI**

```typescript
// Modify src/cli.ts - add to the command list
import { setupOAuth } from './commands/setup-oauth'

// Find where commands are registered and add:
const commands: Record<string, () => Promise<void>> = {
  'sync-stories': syncStories,
  'setup-oauth': setupOAuth,
}

// Update the command name handling
const command = args[0]
if (!command || !commands[command]) {
  console.error('Available commands:')
  console.error('  sync-stories    Sync user stories from GitHub Issues')
  console.error('  setup-oauth     Create GitHub OAuth app and update .env')
  process.exit(1)
}

await commands[command]()
```

- [ ] **Step 3: Test manually**

Run: `bun run cli setup-oauth`  
Expected: Error about GITHUB_TOKEN (since we're not providing it in test)

Note: Manual testing is sufficient for CLI commands. Document that users need GITHUB_TOKEN with admin:oauth_app scope, or can create OAuth app manually at https://github.com/settings/developers

- [ ] **Step 4: Update package.json scripts (optional)**

```json
"scripts": {
  "setup:oauth": "bun run cli setup-oauth"
}
```

- [ ] **Step 5: Commit**

```bash
git add src/commands/setup-oauth.ts src/cli.ts
git commit -m "feat(auth): add CLI command for OAuth app setup"
```

---

### Task 10: Final Integration & Documentation

**Files:**
- Create: `.env.example`
- Modify: `README.md` or `CLAUDE.md` if setup instructions exist

- [ ] **Step 1: Create .env.example**

```bash
# .env.example
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
GITHUB_AUTHZ_REPO=flexion/forms-lab
SESSION_SECRET=generated_random_32_byte_secret
```

- [ ] **Step 2: Update CLAUDE.md with OAuth setup instructions**

Add to CLAUDE.md under "Quick Reference" or create a new "Setup" section:

```markdown
## Setup

### GitHub OAuth

To enable authentication:

1. Create a GitHub OAuth app:
   ```bash
   bun run cli setup-oauth
   ```
   
   Or manually at https://github.com/settings/developers:
   - Application name: Forms Lab (dev)
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3000/auth/callback

2. Copy `.env.example` to `.env` and fill in credentials:
   ```bash
   cp .env.example .env
   ```

3. Start the dev server:
   ```bash
   bun run dev
   ```

4. Visit http://localhost:3000 and click "Sign in"
```

- [ ] **Step 3: Run all tests**

Run: `bun test`  
Expected: All tests pass

- [ ] **Step 4: Test type checking**

Run: `bun run --no-warnings tsc --noEmit`  
Expected: No errors

- [ ] **Step 5: Test biome linting**

Run: `bunx @biomejs/biome check .`  
Expected: No errors (or run with `--write` to auto-fix)

- [ ] **Step 6: Manual smoke test**

1. Start dev server: `bun run dev`
2. Visit http://localhost:3000
3. Verify "Sign in" link appears
4. Click sign-in (will redirect to GitHub - won't work without OAuth app configured)
5. Visit http://localhost:3000/projects directly (should redirect to signin)

- [ ] **Step 7: Final commit**

```bash
git add .env.example CLAUDE.md
git commit -m "docs: add OAuth setup instructions and env example"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✓ OAuth flow (signin, callback, signout routes)
- ✓ Session management (encrypted cookies)
- ✓ Auth middleware (session reader + requireAuth)
- ✓ GitHub OAuth integration (token exchange, profile fetch, repo permission check)
- ✓ Protected /projects/* routes
- ✓ Header integration (user display, sign-in/out)
- ✓ CLI setup command
- ✓ All test cases from spec

**Type Consistency:**
- SessionUser type used consistently across session.ts, middleware, routes, and Layout
- GitHubUser type matches GitHub API response structure
- All imports match exported names

**No Placeholders:**
- All code blocks are complete and executable
- All test assertions are specific
- All commands include expected output
- File paths are exact

---

## Implementation Complete

All tasks follow TDD:
1. Write failing test
2. Run to verify failure
3. Implement minimal code
4. Run to verify pass
5. Commit

Each commit represents a working, tested increment of functionality.
