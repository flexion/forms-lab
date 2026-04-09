# Story 2 Authentication: Finish Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix path alignment issues from rebase and complete remaining acceptance criteria (threat model, passing checks) to make PR #11 merge-ready.

**Architecture:** The auth implementation is complete (session encryption, OAuth flow, middleware, routes, header integration, CLI command). The rebase over main introduced path misalignment because main moved web app files from `src/` to `src/app/`. Three source files and four test files need path corrections.

**Tech Stack:** Bun, Hono, TypeScript

---

## File Structure

**Files to move (source → destination):**
- `src/middleware/auth.ts` → `src/app/middleware/auth.ts`
- `src/routes/auth/index.ts` → `src/app/routes/auth/index.ts`
- `src/routes/projects/index.tsx` → `src/app/routes/projects/index.tsx`

**Files with import path fixes (no move needed):**
- `test/auth-middleware.test.ts` — update middleware import
- `test/auth-routes.test.ts` — update middleware and routes imports
- `test/projects-routes.test.ts` — update middleware and routes imports
- `test/flex-layout.test.tsx` — update component import

**Files already correct (no changes needed):**
- `src/app/server.tsx` — imports `./middleware/auth`, `./routes/auth/index`, `./routes/projects/index` (correct after moves)
- `src/lib/session.ts`, `src/lib/github-oauth.ts` — shared libs, paths unchanged
- `src/commands/setup-oauth.ts` — CLI command, no path issues
- `src/cli.ts` — already resolved during rebase
- `test/session.test.ts`, `test/github-oauth.test.ts`, `test/server.test.ts` — import from `src/lib/` or `src/app/`, already correct

**File to update:**
- `catalog/architecture/threat-model.md` — update existing "Browser to Hono application (authentication)" section (lines 122-138) from "planned" status to actual implementation details, and update the risk summary table

---

### Task 1: Move auth source files to `src/app/` directory

**Files:**
- Move: `src/middleware/auth.ts` → `src/app/middleware/auth.ts`
- Move: `src/routes/auth/index.ts` → `src/app/routes/auth/index.ts`
- Move: `src/routes/projects/index.tsx` → `src/app/routes/projects/index.tsx`

- [ ] **Step 1: Create destination directories and move files**

```bash
mkdir -p src/app/middleware src/app/routes/auth src/app/routes/projects
git mv src/middleware/auth.ts src/app/middleware/auth.ts
git mv src/routes/auth/index.ts src/app/routes/auth/index.ts
git mv src/routes/projects/index.tsx src/app/routes/projects/index.tsx
```

- [ ] **Step 2: Remove empty old directories**

```bash
rmdir src/middleware src/routes/auth src/routes/projects src/routes
```

- [ ] **Step 3: Fix import path in `src/app/middleware/auth.ts`**

Change line 3 from:
```typescript
import { COOKIE_NAME, decryptSession, type SessionUser } from '../lib/session'
```
To:
```typescript
import { COOKIE_NAME, decryptSession, type SessionUser } from '../../lib/session'
```

The file moved one directory deeper (from `src/middleware/` to `src/app/middleware/`), so `../lib/` becomes `../../lib/`.

- [ ] **Step 4: Fix import paths in `src/app/routes/auth/index.ts`**

Change lines 3-8 from:
```typescript
import {
  checkRepoPermission,
  exchangeCodeForToken,
  fetchUserProfile,
} from '../../lib/github-oauth'
import { COOKIE_MAX_AGE, COOKIE_NAME, encryptSession } from '../../lib/session'
```
To:
```typescript
import {
  checkRepoPermission,
  exchangeCodeForToken,
  fetchUserProfile,
} from '../../../lib/github-oauth'
import { COOKIE_MAX_AGE, COOKIE_NAME, encryptSession } from '../../../lib/session'
```

The file moved one directory deeper (from `src/routes/auth/` to `src/app/routes/auth/`), so `../../lib/` becomes `../../../lib/`.

- [ ] **Step 5: Verify `src/app/routes/projects/index.tsx` needs no import change**

The file imports `'../../components/flex-layout'`. After moving from `src/routes/projects/` to `src/app/routes/projects/`, `../../` resolves to `src/app/`, so the import becomes `src/app/components/flex-layout` which is correct. No change needed.

---

### Task 2: Fix test import paths

**Files:**
- Modify: `test/auth-middleware.test.ts`
- Modify: `test/auth-routes.test.ts`
- Modify: `test/projects-routes.test.ts`
- Modify: `test/flex-layout.test.tsx`

- [ ] **Step 1: Fix `test/auth-middleware.test.ts`**

Change line 4 from:
```typescript
import { requireAuth, sessionReader } from '../src/middleware/auth'
```
To:
```typescript
import { requireAuth, sessionReader } from '../src/app/middleware/auth'
```

- [ ] **Step 2: Fix `test/auth-routes.test.ts`**

Change line 5 from:
```typescript
import { sessionReader } from '../src/middleware/auth'
```
To:
```typescript
import { sessionReader } from '../src/app/middleware/auth'
```

Change line 6 from:
```typescript
import authRoutes from '../src/routes/auth'
```
To:
```typescript
import authRoutes from '../src/app/routes/auth'
```

- [ ] **Step 3: Fix `test/projects-routes.test.ts`**

Change line 4 from:
```typescript
import { requireAuth, sessionReader } from '../src/middleware/auth'
```
To:
```typescript
import { requireAuth, sessionReader } from '../src/app/middleware/auth'
```

Change line 5 from:
```typescript
import projectsRoutes from '../src/routes/projects/index.tsx'
```
To:
```typescript
import projectsRoutes from '../src/app/routes/projects/index.tsx'
```

- [ ] **Step 4: Fix `test/flex-layout.test.tsx`**

Change line 2 from:
```typescript
import { Layout } from '../src/components/flex-layout'
```
To:
```typescript
import { Layout } from '../src/app/components/flex-layout'
```

---

### Task 3: Verify all checks pass

- [ ] **Step 1: Run tests**

```bash
bun test
```

Expected: All tests pass (81 tests, 0 failures).

- [ ] **Step 2: Run type checking**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run lint**

```bash
bunx @biomejs/biome check .
```

Expected: No errors (or fix with `bunx @biomejs/biome check --write .`).

- [ ] **Step 4: Commit path alignment fix**

```bash
git add -A
git commit -m "fix: align auth file paths with src/app/ directory structure

After rebase over main, auth middleware and route files were still at
the old src/middleware/ and src/routes/ paths. Moved them to src/app/
and updated all import paths in source and test files."
```

---

### Task 4: Update threat model for authentication

Per issue #2 acceptance criteria: "Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`"

The threat model file already exists (from merged PR #15). The "Browser to Hono application (authentication)" section at lines 122-138 currently says "planned" / "Future -- Story 2". Update it with actual implementation details and update the risk summary table.

**Files:**
- Modify: `catalog/architecture/threat-model.md`

- [ ] **Step 1: Update the authentication trust boundary section**

Replace the "Browser to Hono application (authentication)" section (lines 122-138) with actual implementation details:

Replace this content:
```markdown
### Browser to Hono application (authentication)

**What crosses:** OAuth tokens, session cookies, user identity information. (Future -- Story 2)

**Threats:**
- **Session hijacking** -- stolen session cookies used to impersonate authenticated users.
- **CSRF** -- cross-site requests that perform actions using the user's session.
- **OAuth token theft** -- authorization codes or tokens intercepted during the OAuth flow.
- **Privilege escalation** -- users gaining authoring access without proper GitHub repo permissions.

**Mitigations (planned):**
- Session cookies will use `HttpOnly`, `Secure`, `SameSite=Strict` attributes.
- OAuth flow will use PKCE and state parameter validation.
- Authorization checks will verify GitHub repo write access, not just authentication.
- Protected routes (`/authoring/*`) will require valid session; public routes (`/`, `/catalog/*`, `/health`) will not.

**Residual risk:** To be fully assessed when Story 2 is implemented. The threat model should be updated with actual implementation details during that story.
```

With:
```markdown
### Browser to Hono application (authentication)

**What crosses:** OAuth authorization codes, encrypted session cookies, user identity information (login, display name, avatar URL).

**Threats:**
- **Session hijacking** -- stolen session cookies used to impersonate authenticated users.
- **Session cookie tampering** -- attacker modifies cookie payload to change identity.
- **CSRF** -- cross-site requests that perform state-changing actions (sign-out) using the user's session.
- **OAuth token theft** -- authorization codes intercepted during the OAuth redirect flow.
- **Privilege escalation** -- users gaining authoring access without proper GitHub repo permissions.
- **Open redirect** -- attacker crafts sign-in URL with `returnTo` pointing to external site.
- **Session fixation** -- attacker sets a known session cookie before user authenticates.

**Mitigations:**
- Session cookies use AES-GCM encryption with PBKDF2-derived key (100k iterations, SHA-256) and random 12-byte IV per session. Cookie attributes: `HttpOnly`, `SameSite=Lax`, 7-day max-age. `Secure` flag set in production.
- No access tokens or secrets stored in session -- only user profile data (login, name, avatar URL). GitHub OAuth tokens are used server-side only during callback and immediately discarded.
- OAuth state parameter carries `returnTo` path as JSON. Authorization codes are exchanged server-to-server with client secret.
- Authorization checks verify GitHub repo write/admin permission via collaborator API -- authentication alone is insufficient.
- Protected routes (`/projects/*`) require valid session via `requireAuth` middleware; public routes (`/`, `/catalog/*`, `/health`, `/static/*`) do not.
- Sign-out is POST-only (form submission), preventing GET-based CSRF. SameSite=Lax prevents cross-origin POST cookie sending.
- Session cookie is only created after successful OAuth callback with a fresh random IV, so pre-set cookies are simply invalid.

**Residual risk:** The `returnTo` parameter is not validated against a whitelist of internal paths -- an attacker could craft a sign-in link that redirects to an external site after authentication. Mitigation: validate that `returnTo` starts with `/` and does not contain `//` or protocol schemes. No server-side session revocation -- sessions rely on cookie expiry (7 days). No PKCE in the OAuth flow (GitHub OAuth Apps do not support PKCE; only GitHub Apps do). No rate limiting on the OAuth callback endpoint beyond GitHub's own rate limits.
```

- [ ] **Step 2: Update the risk summary table**

In the risk summary table, replace the row:
```markdown
| Session hijacking | Browser-Hono Auth | Medium | High | Secure cookie attributes (planned) | Planned |
```

With:
```markdown
| Session hijacking | Browser-Hono Auth | Medium | High | AES-GCM encrypted cookies, HttpOnly, SameSite=Lax | Mitigated |
| Open redirect via returnTo | Browser-Hono Auth | Low | Medium | None -- returnTo not validated | Unmitigated |
```

- [ ] **Step 3: Add change log entry**

Add a new row to the change log table:
```markdown
| 2026-04-09 | #11 / Story 2 | Updated authentication boundary from planned to implemented; added open redirect risk |
```

- [ ] **Step 4: Commit threat model update**

```bash
git add catalog/architecture/threat-model.md
git commit -m "docs: update threat model with authentication implementation details

Replace planned mitigations with actual implementation: AES-GCM
encrypted cookies, PBKDF2 key derivation, repo permission gating.
Add open redirect risk for returnTo parameter."
```

---

### Task 5: Final verification and squash rebase history

- [ ] **Step 1: Run full verification**

```bash
bun test && bun run --no-warnings tsc --noEmit && bunx @biomejs/biome check .
```

Expected: All pass.

- [ ] **Step 2: Review acceptance criteria**

Verify each criterion from issue #2:
- Sign-in link visible on public pages — Layout renders "Sign in" when no user
- Clicking sign-in initiates GitHub OAuth flow — `/auth/signin` redirects to GitHub
- After authentication, user sees identity in header — Layout renders avatar + name
- Authenticated users see authoring navigation — "My Projects" link available
- Unauthenticated users see only public catalog — `/projects` redirects to signin
- Sign-out clears session — POST `/auth/signout` deletes cookie
- Auth middleware protects authoring routes — `requireAuth()` on `/projects/*`
- Threat model updated — `catalog/architecture/threat-model.md` created
- Tests pass — verified in step 1
- Type checking passes — verified in step 1

- [ ] **Step 3: Force push rebased branch**

```bash
git push --force-with-lease origin story-2/authentication
```

---

## Self-Review

**Spec coverage:** All acceptance criteria from issue #2 are addressed. The auth implementation was already complete — this plan covers only the path realignment, verification, and threat model.

**Placeholder scan:** No TBD/TODO items. All steps contain exact commands or exact code changes.

**Type consistency:** Import paths in all 7 files (3 source, 4 test) have been traced through to verify correctness after moves. `server.tsx` relative imports (`./middleware/auth`, `./routes/auth/index`, `./routes/projects/index`) resolve correctly once files are under `src/app/`.
