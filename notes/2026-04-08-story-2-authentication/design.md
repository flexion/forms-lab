# Story 2: Maya Signs In to Access Form Authoring

## Overview

GitHub OAuth authentication for Forms Lab. Authenticated users see their identity in the header and can access protected `/projects/*` routes. Unauthenticated users see public catalog content with a sign-in link.

This story builds the auth gate only — no authoring UI beyond a placeholder projects page.

## OAuth Flow

### GitHub OAuth App (Classic)

A personal GitHub OAuth App created via CLI automation. Exchanges an authorization code for an access token, then fetches the user's GitHub profile.

### Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/auth/signin` | Public | Redirects to GitHub OAuth authorization URL. Accepts optional `returnTo` query param. |
| GET | `/auth/callback` | Public | Handles GitHub redirect. Exchanges code for token, fetches profile, sets session cookie, redirects to `returnTo` or `/projects`. |
| POST | `/auth/signout` | Public | Clears session cookie, redirects to `/`. |
| GET | `/projects` | Protected | Placeholder "My Projects" page (empty state for now). |

### Public Routes (unchanged)

`/`, `/catalog/*`, `/health`, `/static/*`

## Session Management

### Encrypted Cookie

Session data lives in a signed, encrypted cookie. No server-side session store.

Cookie payload:

```ts
interface SessionUser {
  login: string       // GitHub username
  name: string        // Display name
  avatarUrl: string   // GitHub avatar URL
}
```

### Environment Variables

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SESSION_SECRET=...       # For cookie encryption, auto-generated if missing
```

Missing OAuth credentials in dev means the sign-in link shows a helpful message rather than crashing.

## Middleware

### Session Reader (global)

Applied to all routes. Reads and decrypts the session cookie, sets `c.set('user', sessionUser | null)` on the Hono context.

### requireAuth (applied to `/projects/*`)

If no session, redirects to `/auth/signin?returnTo=<current-path>`. Otherwise, passes through.

## Header Integration

The `Layout` component receives the user from context:

- **Signed out:** "Sign in" link pointing to `/auth/signin`
- **Signed in:** Small avatar image + display name + "Sign out" button (form POST to `/auth/signout`)

No authoring navigation in this story — just identity display and sign-in/out controls.

## CLI: OAuth App Setup

Command: `bun run cli setup-oauth`

1. Prompts for callback URL (default: `http://localhost:3000/auth/callback`)
2. Creates OAuth App via GitHub API (`POST /user/apps`)
3. Writes `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to `.env`
4. Generates `SESSION_SECRET` if not already present

## File Structure

```
src/
  middleware/
    auth.ts              # Session reader + requireAuth guard
  routes/
    auth/
      index.ts           # signin, callback, signout routes
    projects/
      index.ts           # Placeholder "My Projects" page
  lib/
    session.ts           # Cookie encrypt/decrypt, session types
    github-oauth.ts      # Token exchange, user profile fetch
  commands/
    setup-oauth.ts       # CLI command to create OAuth app + write .env
test/
  auth-middleware.test.ts
  auth-routes.test.ts
  session.test.ts
```

### server.tsx Changes

1. Apply session-reading middleware globally
2. Apply `requireAuth` to `/projects/*`
3. Mount auth routes at `/auth`
4. Pass user to `Layout` for header rendering

## Testing Strategy

### Unit Tests

- Session cookie encryption/decryption round-trips correctly
- Auth middleware sets user context from valid cookie
- Auth middleware sets `null` for missing/invalid cookie
- `requireAuth` redirects with correct `returnTo` param
- Sign-out clears the cookie

### Integration Tests

- `GET /auth/signin` redirects to GitHub with correct OAuth params
- `GET /auth/callback` with mock code exchanges token and sets cookie for authorized user
- `GET /auth/callback` redirects to `/` with error when user lacks repo access
- `GET /projects` redirects when unauthenticated
- `GET /projects` renders with valid session cookie
- Public routes remain accessible without authentication

### Test Helpers

`createSessionCookie(user)` — generates a valid encrypted cookie for integration tests without mocking the OAuth flow.

### Not Tested

- Live GitHub OAuth round-trip (integration concern)
- CLI setup command's GitHub API call (tested manually)

## Authorization Model

The OAuth callback checks that the authenticated user has write (or admin) permission on the `flexion/forms-lab` repo via `GET /repos/flexion/forms-lab/collaborators/:username/permission`. If the user lacks sufficient access, no session is created — they are redirected to `/` with a query param indicating access was denied.

This keeps authorization simple (no roles table, no local user store) and tied to the existing GitHub permission model the team already uses.

Environment variable for the repo check:

```
GITHUB_AUTHZ_REPO=flexion/forms-lab   # defaults to this if unset
```

## Success Metrics

- Authentication round-trip completes in under 3 seconds
- Protected routes correctly reject unauthenticated requests
