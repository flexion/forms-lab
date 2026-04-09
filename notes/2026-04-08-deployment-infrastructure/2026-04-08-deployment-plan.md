# Deployment Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the forms-lab app to a single EC2 instance with webhook-driven branch deployments, completing issue #1.

**Architecture:** Pulumi provisions EC2 + EIP. NixOS declaratively manages the server: Caddy reverse proxy, per-branch app systemd services, and a webhook listener. GitHub push webhooks trigger a deploy script that creates/updates git worktrees, builds, restarts services, and reloads Caddy routing. The app runs at subpath URLs (`/main/`, `/slice-1/`) using Hono's `basePath()`.

**Tech Stack:** Bun, Hono, Pulumi (TypeScript), NixOS, Caddy, systemd, sops-nix, AWS EC2

**Spec:** `notes/2026-04-08-deployment-infrastructure/2026-04-08-deployment-design.md`

---

## PR Boundaries

This plan is structured as a sequence of tasks that can be split into PRs:

- **PR A (repo reorg + BASE_PATH):** Tasks 1–3. Restructures `src/` into multi-entrypoint layout, adds BASE_PATH support. No infrastructure yet — all local, all testable.
- **PR B (webhook service):** Tasks 4–5. Webhook listener service with tests. Still no infrastructure — runs locally.
- **PR C (CLI commands):** Task 6. CLI commands for infrastructure operations.
- **PR D (Pulumi + NixOS + docs):** Tasks 7–10. Infrastructure code, NixOS config, catalog documentation, CLAUDE.md updates.

Tasks within each PR should be committed individually but merged together.

---

### Task 1: Reorganize src/ into multi-entrypoint layout

Move the app code under `src/app/` so the webhook service can live alongside it at `src/webhook/`.

**Files:**
- Move: `src/server.tsx` → `src/app/server.tsx`
- Move: `src/dev.ts` → `src/app/main.ts`
- Move: `src/routes/` → `src/app/routes/`
- Move: `src/components/` → `src/app/components/`
- Move: `src/public/` → `src/app/public/`
- Modify: `src/app/main.ts` (update import path)
- Modify: `src/app/server.tsx` (update import paths)
- Modify: `src/app/routes/catalog/index.tsx` (update import paths)
- Modify: `src/app/routes/catalog/*.tsx` (update import paths for markdown, components)
- Modify: `package.json` (update script paths)
- Modify: `scripts/build-css.ts` (update entrypoint path)
- Modify: `scripts/build-components.ts` (update entrypoint path)
- Modify: `test/server.test.ts` (update import path)
- Modify: `test/cli.test.ts` (import path stays — cli.ts doesn't move)
- Modify: `test/catalog-*.test.ts` (update import paths if they reference server)
- Modify: `test/markdown.test.ts` (import path stays — lib doesn't move)
- Modify: `biome.json` (ensure `src/**` still covers `src/app/**`)
- Modify: `tsconfig.json` (include paths still work — `src/**/*` covers `src/app/**/*`)
- Modify: `.github/workflows/ci.yml` (no changes needed — uses package.json scripts)
- Modify: `.stylelintrc.json` or `package.json` lint:css script (update glob if needed)

- [ ] **Step 1: Create the `src/app/` directory and move files**

```bash
cd /home/daniel/src/forms-lab
mkdir -p src/app
git mv src/server.tsx src/app/server.tsx
git mv src/dev.ts src/app/main.ts
git mv src/routes src/app/routes
git mv src/components src/app/components
git mv src/public src/app/public
```

- [ ] **Step 2: Update `src/app/main.ts` import**

The file currently has `import app from './server'`. After the move, the relative path is the same (`./server`), so this import is still correct. But verify:

```typescript
// src/app/main.ts — import should still be:
import app from './server'
```

No change needed.

- [ ] **Step 3: Update `src/app/server.tsx` import paths**

The server imports from `./components/flex-layout` and `./routes/catalog/index`. After the move these are under `src/app/` so relative paths stay the same. But the import of shared code needs checking:

```typescript
// src/app/server.tsx — these relative paths are still valid after move:
// import { Layout } from './components/flex-layout'      ✓ (moved together)
// import catalog from './routes/catalog/index'            ✓ (moved together)
```

No change needed — everything under `src/app/` moved together.

- [ ] **Step 4: Update route files that import from `../../lib/` or `../../services/`**

Check all route files for imports that reference `src/lib/` or `src/services/`. After the move, files in `src/app/routes/catalog/` need to reach `src/lib/` which is now one level further up.

Before: `src/routes/catalog/personas.tsx` imports `../../lib/markdown` → resolves to `src/lib/markdown` ✓
After: `src/app/routes/catalog/personas.tsx` imports `../../lib/markdown` → resolves to `src/app/lib/markdown` ✗

Fix all catalog route files — the import prefix changes from `../../lib/` to `../../../lib/` and `../../services/` to `../../../services/`:

Run this to find affected imports:

```bash
grep -rn "from '\.\./\.\./lib\|from '\.\./\.\./services" src/app/routes/
```

For each file found, update the import paths. For example in `src/app/routes/catalog/personas.tsx`:

Old: `import { readMarkdownDir, readMarkdownFile } from '../../lib/markdown'`
New: `import { readMarkdownDir, readMarkdownFile } from '../../../lib/markdown'`

Repeat for all files in `src/app/routes/` that import from `lib/` or `services/`.

- [ ] **Step 5: Update component files that import from shared paths**

Check if any component files import from `../../lib/` or `../../services/` or `../../types/`:

```bash
grep -rn "from '\.\./\.\./lib\|from '\.\./\.\./services\|from '\.\./\.\./types" src/app/components/
```

For any found, add one more `../` to the relative path.

- [ ] **Step 6: Update `scripts/build-css.ts`**

Old path:
```typescript
const entrypoint = resolve(import.meta.dir, '../src/public/styles.css')
```

New path:
```typescript
const entrypoint = resolve(import.meta.dir, '../src/app/public/styles.css')
```

- [ ] **Step 7: Update `scripts/build-components.ts`**

Old path:
```typescript
const entrypoint = resolve(import.meta.dir, '../src/components/register.ts')
```

New path:
```typescript
const entrypoint = resolve(import.meta.dir, '../src/app/components/register.ts')
```

- [ ] **Step 8: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "bun run --watch src/app/main.ts",
    "start": "bun run src/app/main.ts",
    "webhook": "bun run src/webhook/main.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:conformance": "bunx playwright test",
    "test:all": "bun test && bunx playwright test",
    "cli": "bun run src/cli.ts",
    "build:css": "bun run scripts/build-css.ts",
    "build:components": "bun run scripts/build-components.ts",
    "build": "bun run build:css && bun run build:components",
    "lint:css": "bunx stylelint 'src/**/*.css'"
  }
}
```

- [ ] **Step 9: Update `test/server.test.ts` import**

Old:
```typescript
import app from '../src/server'
```

New:
```typescript
import app from '../src/app/server'
```

- [ ] **Step 10: Update any other test files that import from moved paths**

Check all test files:

```bash
grep -rn "from '\.\./src/server\|from '\.\./src/dev\|from '\.\./src/routes\|from '\.\./src/components\|from '\.\./src/public" test/
```

Update each import to include the `app/` segment. For example, catalog test files that import the app:

```bash
grep -rn "from '\.\./src/" test/
```

Fix each one.

- [ ] **Step 11: Update `playwright.config.ts` if it references `src/dev.ts`**

Check if the Playwright config starts the dev server:

```bash
grep -n "dev.ts\|server" playwright.config.ts
```

If it references `src/dev.ts`, update to `src/app/main.ts`.

- [ ] **Step 12: Run tests and verify everything passes**

```bash
bun run build
bun test
bun run --no-warnings tsc --noEmit
bunx @biomejs/biome check .
```

Expected: all pass with no errors.

- [ ] **Step 13: Run dev server and verify it starts**

```bash
bun run dev
```

Expected: `Server running on http://localhost:3000`

Visit `http://localhost:3000/health` — should return `{"status":"ok","timestamp":"..."}`.

Kill the server.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: reorganize src/ into multi-entrypoint layout

Move app code under src/app/ to support multiple entrypoints (app,
webhook). Shared code (lib, services, types, cli) stays at src/ root.
Update all import paths, build scripts, and test imports.
EOF
)"
```

---

### Task 2: Add BASE_PATH support to the app

Make the app base-path-aware so it works at subpath URLs like `/main/`.

**Files:**
- Create: `src/lib/base-path.ts`
- Create: `test/base-path.test.ts`
- Modify: `src/app/server.tsx`
- Modify: `src/app/components/flex-layout/index.tsx`

- [ ] **Step 1: Write the failing test for basePath utility**

Create `test/base-path.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'bun:test'
import { getBasePath, resolveUrl } from '../src/lib/base-path'

describe('base-path', () => {
  afterEach(() => {
    delete process.env.BASE_PATH
  })

  describe('getBasePath', () => {
    it('returns "/" when BASE_PATH is not set', () => {
      delete process.env.BASE_PATH
      expect(getBasePath()).toBe('/')
    })

    it('returns BASE_PATH when set', () => {
      process.env.BASE_PATH = '/main/'
      expect(getBasePath()).toBe('/main/')
    })

    it('ensures trailing slash', () => {
      process.env.BASE_PATH = '/main'
      expect(getBasePath()).toBe('/main/')
    })

    it('ensures leading slash', () => {
      process.env.BASE_PATH = 'main/'
      expect(getBasePath()).toBe('/main/')
    })
  })

  describe('resolveUrl', () => {
    it('prepends base path to relative URL', () => {
      process.env.BASE_PATH = '/main/'
      expect(resolveUrl('/catalog')).toBe('/main/catalog')
    })

    it('handles root base path', () => {
      delete process.env.BASE_PATH
      expect(resolveUrl('/catalog')).toBe('/catalog')
    })

    it('avoids double slashes', () => {
      process.env.BASE_PATH = '/main/'
      expect(resolveUrl('/static/styles.css')).toBe('/main/static/styles.css')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/base-path.test.ts
```

Expected: FAIL — `Cannot find module '../src/lib/base-path'`

- [ ] **Step 3: Implement base-path utility**

Create `src/lib/base-path.ts`:

```typescript
export function getBasePath(): string {
  const raw = process.env.BASE_PATH || '/'
  let path = raw
  if (!path.startsWith('/')) path = `/${path}`
  if (!path.endsWith('/')) path = `${path}/`
  return path
}

export function resolveUrl(path: string): string {
  const base = getBasePath()
  if (base === '/') return path
  // Strip leading slash from path to avoid double slash
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${base}${clean}`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/base-path.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/base-path.ts test/base-path.test.ts
git commit -m "$(cat <<'EOF'
feat: add BASE_PATH utility for subpath deployment

getBasePath() reads BASE_PATH env var with normalization.
resolveUrl() prepends the base path to relative URLs.
Defaults to "/" when unset (local dev).
EOF
)"
```

- [ ] **Step 6: Update `src/app/server.tsx` to use basePath**

Add `app.basePath()` call. The key change — add the basePath before route definitions:

```typescript
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { getBasePath } from '../lib/base-path'
import { Layout } from './components/flex-layout'
import catalog from './routes/catalog/index'

const basePath = getBasePath()
const app = new Hono().basePath(basePath)

// ... rest of routes unchanged
```

- [ ] **Step 7: Update Layout component to use resolveUrl**

Modify `src/app/components/flex-layout/index.tsx` — update hardcoded paths:

Replace hardcoded `/static/` and `/catalog` paths with `resolveUrl()`:

```typescript
import { resolveUrl } from '../../../lib/base-path'
```

Then update all hardcoded paths in the template:

- `href="/static/styles.css"` → `href={resolveUrl('/static/styles.css')}`
- `src="/static/components.js"` → `src={resolveUrl('/static/components.js')}`
- `href="/"` → `href={resolveUrl('/')}`
- `href="/catalog"` → `href={resolveUrl('/catalog')}`
- `href="/catalog/design-system"` → `href={resolveUrl('/catalog/design-system')}`
- Icon `src` attributes like `src="/static/sprite.svg#..."` → `src={resolveUrl('/static/sprite.svg')}#...` (note: the fragment needs handling — split at `#`)

For the sprite SVG references that use `#fragment`:

```typescript
src={`${resolveUrl('/static/sprite.svg')}#account_balance`}
```

- [ ] **Step 8: Update server test to work with basePath**

Modify `test/server.test.ts` — when `BASE_PATH` is not set, the app defaults to `/` so existing tests should still pass. Verify:

```bash
bun test test/server.test.ts
```

Expected: PASS — the basePath defaults to `/`, so routes still match at `/health` and `/`.

- [ ] **Step 9: Add a test for BASE_PATH-mounted routes**

Add to `test/server.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'

// ... existing tests ...

describe('Server with BASE_PATH', () => {
  beforeAll(() => {
    process.env.BASE_PATH = '/test-branch/'
  })

  afterAll(() => {
    delete process.env.BASE_PATH
  })

  // Note: Since basePath is read at module load time, we need to
  // re-import the app. For now, test that the utility works correctly
  // and that the default (no BASE_PATH) routes work as before.
  // Full integration test of basePath mounting will be done manually
  // or in a dedicated test that dynamically imports the server module.
})
```

Actually, since `getBasePath()` is called at module load time when `server.tsx` is first imported, and Bun caches module imports, testing with a different BASE_PATH requires dynamic import. The unit tests on `base-path.ts` already cover the logic. Skip the mounted-routes integration test for now — the e2e validation will happen when deploying.

- [ ] **Step 10: Run full test suite**

```bash
bun run build
bun test
bun run --no-warnings tsc --noEmit
bunx @biomejs/biome check .
```

Expected: all pass.

- [ ] **Step 11: Commit**

```bash
git add src/app/server.tsx src/app/components/flex-layout/index.tsx
git commit -m "$(cat <<'EOF'
feat: add BASE_PATH support for subpath deployments

App reads BASE_PATH env var and mounts all routes under that prefix
using Hono's basePath(). Layout resolves all asset/link URLs relative
to the base path. Defaults to "/" for local development.
EOF
)"
```

---

### Task 3: Update route link generation for BASE_PATH

Any route that generates links or redirects needs to use `resolveUrl()`. Check all route files and components that hardcode paths.

**Files:**
- Modify: `src/app/routes/catalog/index.tsx`
- Modify: `src/app/routes/catalog/personas.tsx`
- Modify: `src/app/routes/catalog/decisions.tsx`
- Modify: `src/app/routes/catalog/architecture.tsx`
- Modify: `src/app/routes/catalog/stories.tsx`
- Modify: `src/app/routes/catalog/experiments.tsx`
- Modify: `src/app/routes/catalog/design-system.tsx`
- Modify: `src/app/routes/catalog/sidebar.ts`
- Modify: Any component that generates `href` values

- [ ] **Step 1: Audit all hardcoded paths in routes**

```bash
grep -rn 'href="/' src/app/routes/
grep -rn 'href="/' src/app/components/
```

For each hardcoded `href="/..."` in JSX templates (not in the route definitions themselves — Hono handles those), replace with `resolveUrl()`.

Note: Route **definitions** like `app.get('/catalog/personas', ...)` do NOT need changing — Hono's basePath handles that. Only **generated HTML** (links in templates, redirects) needs resolveUrl.

- [ ] **Step 2: Update sidebar link generation**

Check `src/app/routes/catalog/sidebar.ts` — if it generates link URLs, update them.

- [ ] **Step 3: Update any `c.redirect()` calls**

```bash
grep -rn 'c.redirect' src/app/routes/
```

If any exist, update the target URL with `resolveUrl()`.

- [ ] **Step 4: Run tests**

```bash
bun run build
bun test
```

Expected: all pass. Some test assertions may need updating if they check for specific href values in HTML output — the default BASE_PATH is `/` so generated URLs should be identical to before.

- [ ] **Step 5: Commit**

```bash
git add src/app/
git commit -m "$(cat <<'EOF'
feat: update route templates to use resolveUrl for BASE_PATH

All generated links in catalog routes and components now use
resolveUrl() so they resolve correctly under subpath deployments.
EOF
)"
```

---

### Task 4: Create webhook handler with signature validation

Build the webhook listener service with HMAC signature validation and payload parsing.

**Files:**
- Create: `src/webhook/handler.ts`
- Create: `test/webhook-handler.test.ts`

- [ ] **Step 1: Write the failing test for signature validation**

Create `test/webhook-handler.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import {
  parsePushEvent,
  verifySignature,
} from '../src/webhook/handler'

describe('webhook handler', () => {
  const secret = 'test-secret'

  describe('verifySignature', () => {
    it('returns true for valid signature', async () => {
      const payload = '{"ref":"refs/heads/main"}'
      const hmac = new Bun.CryptoHasher('sha256', secret)
      hmac.update(payload)
      const signature = `sha256=${hmac.digest('hex')}`
      expect(await verifySignature(payload, signature, secret)).toBe(true)
    })

    it('returns false for invalid signature', async () => {
      const payload = '{"ref":"refs/heads/main"}'
      const signature = 'sha256=invalid'
      expect(await verifySignature(payload, signature, secret)).toBe(false)
    })

    it('returns false for missing signature', async () => {
      const payload = '{"ref":"refs/heads/main"}'
      expect(await verifySignature(payload, '', secret)).toBe(false)
    })

    it('returns false for non-sha256 prefix', async () => {
      const payload = '{"ref":"refs/heads/main"}'
      expect(await verifySignature(payload, 'sha1=abc', secret)).toBe(false)
    })
  })

  describe('parsePushEvent', () => {
    it('extracts branch name and SHA from push payload', () => {
      const payload = {
        ref: 'refs/heads/main',
        after: 'abc123',
        deleted: false,
      }
      const result = parsePushEvent(payload)
      expect(result).toEqual({ branch: 'main', sha: 'abc123' })
    })

    it('extracts branch with slashes in name', () => {
      const payload = {
        ref: 'refs/heads/slice-0/skeleton',
        after: 'def456',
        deleted: false,
      }
      const result = parsePushEvent(payload)
      expect(result).toEqual({ branch: 'slice-0/skeleton', sha: 'def456' })
    })

    it('returns null for deleted branch', () => {
      const payload = {
        ref: 'refs/heads/old-branch',
        after: '0000000',
        deleted: true,
      }
      expect(parsePushEvent(payload)).toBeNull()
    })

    it('returns null for tag push', () => {
      const payload = {
        ref: 'refs/tags/v1.0',
        after: 'abc123',
        deleted: false,
      }
      expect(parsePushEvent(payload)).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/webhook-handler.test.ts
```

Expected: FAIL — `Cannot find module '../src/webhook/handler'`

- [ ] **Step 3: Implement webhook handler**

Create `src/webhook/handler.ts`:

```typescript
export interface PushEvent {
  branch: string
  sha: string
}

export async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) return false
  const expected = signature.slice('sha256='.length)
  const hmac = new Bun.CryptoHasher('sha256', secret)
  hmac.update(payload)
  const computed = hmac.digest('hex')
  // Constant-time comparison
  if (expected.length !== computed.length) return false
  const a = new TextEncoder().encode(expected)
  const b = new TextEncoder().encode(computed)
  return crypto.subtle.timingSafeEqual(a, b)
}

interface PushPayload {
  ref: string
  after: string
  deleted: boolean
}

export function parsePushEvent(payload: PushPayload): PushEvent | null {
  if (payload.deleted) return null
  if (!payload.ref.startsWith('refs/heads/')) return null
  const branch = payload.ref.slice('refs/heads/'.length)
  return { branch, sha: payload.after }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/webhook-handler.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/webhook/handler.ts test/webhook-handler.test.ts
git commit -m "$(cat <<'EOF'
feat: add webhook signature validation and push event parsing

verifySignature() validates GitHub HMAC-SHA256 signatures with
constant-time comparison. parsePushEvent() extracts branch and
SHA from push payloads, rejecting deletes and tag pushes.
EOF
)"
```

---

### Task 5: Create webhook service entrypoint and deploy orchestration

Wire the handler into a Hono server and add the deploy script spawner.

**Files:**
- Create: `src/webhook/deploy.ts`
- Create: `src/webhook/main.ts`
- Create: `test/webhook-deploy.test.ts`

- [ ] **Step 1: Write the failing test for deploy orchestration**

Create `test/webhook-deploy.test.ts`:

```typescript
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { triggerDeploy } from '../src/webhook/deploy'

describe('deploy orchestration', () => {
  it('spawns deploy script with branch and SHA', async () => {
    // triggerDeploy should call the deploy script and return the result
    // In test, we verify it constructs the right command
    // The actual deploy script path is configurable via DEPLOY_SCRIPT env var
    process.env.DEPLOY_SCRIPT = 'echo'
    const result = await triggerDeploy('main', 'abc123')
    expect(result.success).toBe(true)
    delete process.env.DEPLOY_SCRIPT
  })

  it('reports failure when deploy script is missing', async () => {
    process.env.DEPLOY_SCRIPT = '/nonexistent/script'
    const result = await triggerDeploy('main', 'abc123')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    delete process.env.DEPLOY_SCRIPT
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/webhook-deploy.test.ts
```

Expected: FAIL — `Cannot find module '../src/webhook/deploy'`

- [ ] **Step 3: Implement deploy orchestration**

Create `src/webhook/deploy.ts`:

```typescript
export interface DeployResult {
  success: boolean
  error?: string
  stdout?: string
  stderr?: string
}

export async function triggerDeploy(
  branch: string,
  sha: string,
): Promise<DeployResult> {
  const script = process.env.DEPLOY_SCRIPT || '/srv/forms-lab/deploy.sh'

  try {
    const proc = Bun.spawn([script, branch, sha], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      console.error(`Deploy failed for ${branch}@${sha}:`, stderr)
      return { success: false, error: stderr, stdout, stderr }
    }

    console.log(`Deploy succeeded for ${branch}@${sha}:`, stdout)
    return { success: true, stdout, stderr }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Deploy error for ${branch}@${sha}:`, message)
    return { success: false, error: message }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/webhook-deploy.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/webhook/deploy.ts test/webhook-deploy.test.ts
git commit -m "$(cat <<'EOF'
feat: add deploy orchestration for webhook-triggered deploys

triggerDeploy() spawns the deploy script with branch name and SHA.
Script path configurable via DEPLOY_SCRIPT env var. Captures stdout/
stderr and reports success/failure.
EOF
)"
```

- [ ] **Step 6: Create webhook entrypoint**

Create `src/webhook/main.ts`:

```typescript
import { Hono } from 'hono'
import { triggerDeploy } from './deploy'
import { parsePushEvent, verifySignature } from './handler'

const app = new Hono()

const secret = process.env.GITHUB_WEBHOOK_SECRET
if (!secret) {
  console.error('GITHUB_WEBHOOK_SECRET environment variable is required')
  process.exit(1)
}

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'webhook' })
})

app.post('/', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('x-hub-signature-256') || ''

  const valid = await verifySignature(body, signature, secret)
  if (!valid) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  const event = c.req.header('x-github-event')
  if (event !== 'push') {
    return c.json({ ignored: true, reason: `Event type: ${event}` }, 200)
  }

  const payload = JSON.parse(body)
  const push = parsePushEvent(payload)
  if (!push) {
    return c.json({ ignored: true, reason: 'Deleted branch or tag push' }, 200)
  }

  // Trigger deploy asynchronously — don't block the webhook response
  triggerDeploy(push.branch, push.sha).catch((err) => {
    console.error('Deploy trigger failed:', err)
  })

  return c.json({ accepted: true, branch: push.branch, sha: push.sha }, 202)
})

const port = process.env.PORT || 9000
console.log(`Webhook listener running on port ${port}`)

export default {
  port: Number(port),
  fetch: app.fetch,
}
```

- [ ] **Step 7: Run type check and lint**

```bash
bun run --no-warnings tsc --noEmit
bunx @biomejs/biome check .
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/webhook/main.ts
git commit -m "$(cat <<'EOF'
feat: add webhook listener entrypoint

Hono server on port 9000 receives GitHub push webhooks. Validates
HMAC signature, parses push events, triggers deploy asynchronously.
Health check at GET /health.
EOF
)"
```

---

### Task 6: Add CLI commands for infrastructure operations

Extend the CLI with `infra`, `nixos`, and `webhook` command groups.

**Files:**
- Create: `src/commands/infra.ts`
- Create: `src/commands/nixos.ts`
- Create: `src/commands/webhook.ts`
- Modify: `src/cli.ts`
- Create: `test/commands-infra.test.ts`

- [ ] **Step 1: Write the failing test for CLI command registration**

Create `test/commands-infra.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { getCommand } from '../src/cli'

describe('CLI infrastructure commands', () => {
  it('registers infra command', () => {
    const cmd = getCommand('infra')
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('infra')
  })

  it('registers nixos command', () => {
    const cmd = getCommand('nixos')
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('nixos')
  })

  it('registers webhook command', () => {
    const cmd = getCommand('webhook')
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('webhook')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/commands-infra.test.ts
```

Expected: FAIL — commands not registered

- [ ] **Step 3: Implement infra command**

Create `src/commands/infra.ts`:

```typescript
import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli infra <subcommand>\n')
  console.log('Subcommands:')
  console.log('  bootstrap    Create S3 bucket for Pulumi state')
  console.log('  up           Provision/update EC2 via Pulumi')
  console.log('  outputs      Show hostname, IP, SSH command')
  console.log('  ssh          SSH into the EC2 instance')
}

async function runPulumi(args: string[]): Promise<number> {
  const proc = Bun.spawn(['pulumi', ...args], {
    cwd: pulumiDir,
    stdio: ['inherit', 'inherit', 'inherit'],
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  return await proc.exited
}

async function getOutput(name: string): Promise<string> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', name], {
    cwd: pulumiDir,
    stdout: 'pipe',
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  const text = await new Response(proc.stdout).text()
  await proc.exited
  return text.trim()
}

export async function infra(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'bootstrap': {
      console.log('Creating S3 bucket for Pulumi state...')
      const proc = Bun.spawn(
        [
          'aws', 's3api', 'create-bucket',
          '--bucket', 'forms-lab-pulumi-state',
          '--region', 'us-east-1',
        ],
        {
          stdio: ['inherit', 'inherit', 'inherit'],
          env: { ...process.env, AWS_PROFILE: 'llm-class' },
        },
      )
      const code = await proc.exited
      if (code === 0) {
        // Enable versioning
        const ver = Bun.spawn(
          [
            'aws', 's3api', 'put-bucket-versioning',
            '--bucket', 'forms-lab-pulumi-state',
            '--versioning-configuration', 'Status=Enabled',
          ],
          {
            stdio: ['inherit', 'inherit', 'inherit'],
            env: { ...process.env, AWS_PROFILE: 'llm-class' },
          },
        )
        await ver.exited
        console.log('S3 bucket created with versioning enabled.')
      }
      return code
    }

    case 'up':
      return runPulumi(['up', '--yes'])

    case 'outputs': {
      const exitCode = await runPulumi(['stack', 'output'])
      if (exitCode === 0) {
        const hostname = await getOutput('hostname')
        if (hostname) {
          console.log(`\nSSH: ssh root@${hostname}`)
        }
      }
      return exitCode
    }

    case 'ssh': {
      const hostname = await getOutput('hostname')
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      console.log(`Connecting to ${hostname}...`)
      const proc = Bun.spawn(['ssh', `root@${hostname}`], {
        stdio: ['inherit', 'inherit', 'inherit'],
      })
      return await proc.exited
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
```

- [ ] **Step 4: Implement nixos command**

Create `src/commands/nixos.ts`:

```typescript
import { resolve } from 'node:path'

const nixosDir = resolve(import.meta.dir, '../../infrastructure/nixos')
const pulumiDir = resolve(import.meta.dir, '../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli nixos <subcommand>\n')
  console.log('Subcommands:')
  console.log('  apply        Push NixOS config to EC2 instance')
  console.log('  status       Show running services and health')
}

async function getHostname(): Promise<string | null> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', 'hostname'], {
    cwd: pulumiDir,
    stdout: 'pipe',
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  const text = await new Response(proc.stdout).text()
  const code = await proc.exited
  return code === 0 ? text.trim() : null
}

export async function nixos(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'apply': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      console.log(`Applying NixOS config to ${hostname}...`)
      const proc = Bun.spawn(
        [
          'nixos-rebuild', 'switch',
          '--flake', `${nixosDir}#forms-lab`,
          '--target-host', `root@${hostname}`,
        ],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      return await proc.exited
    }

    case 'status': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      const proc = Bun.spawn(
        ['ssh', `root@${hostname}`, 'systemctl', 'list-units', 'forms-lab-*'],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      return await proc.exited
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
```

- [ ] **Step 5: Implement webhook command**

Create `src/commands/webhook.ts`:

```typescript
import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli webhook <subcommand>\n')
  console.log('Subcommands:')
  console.log('  setup        Show GitHub webhook configuration guide')
}

export async function webhook(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'setup': {
      let hostname = '<hostname>'
      try {
        const proc = Bun.spawn(['pulumi', 'stack', 'output', 'hostname'], {
          cwd: pulumiDir,
          stdout: 'pipe',
          env: { ...process.env, AWS_PROFILE: 'llm-class' },
        })
        const text = await new Response(proc.stdout).text()
        if ((await proc.exited) === 0 && text.trim()) {
          hostname = text.trim()
        }
      } catch {
        // Pulumi not available — show placeholder
      }

      console.log('GitHub Webhook Configuration')
      console.log('============================\n')
      console.log('Go to: https://github.com/flexion/forms-lab/settings/hooks/new\n')
      console.log(`  Payload URL:    https://${hostname}/.webhook`)
      console.log('  Content type:   application/json')
      console.log('  Secret:         (use the value from sops-nix secret)')
      console.log('  Events:         Just the push event')
      console.log('  Active:         ✓\n')
      console.log('After creating the webhook, push to main to trigger the first deploy.')
      return 0
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
```

- [ ] **Step 6: Register commands in `src/cli.ts`**

Add the new commands to the commands array:

```typescript
import { syncStories } from './commands/sync-stories'
import { infra } from './commands/infra'
import { nixos } from './commands/nixos'
import { webhook } from './commands/webhook'

// ... ParsedArgs and Command interfaces unchanged ...

const commands: Command[] = [
  {
    name: 'sync-stories',
    description: 'Sync user stories from GitHub Issues',
    run: syncStories,
  },
  {
    name: 'infra',
    description: 'Manage EC2 infrastructure via Pulumi',
    run: infra,
  },
  {
    name: 'nixos',
    description: 'Manage NixOS configuration on EC2',
    run: nixos,
  },
  {
    name: 'webhook',
    description: 'GitHub webhook configuration',
    run: webhook,
  },
]
```

- [ ] **Step 7: Run tests**

```bash
bun test test/commands-infra.test.ts
bun test
```

Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add src/commands/infra.ts src/commands/nixos.ts src/commands/webhook.ts src/cli.ts test/commands-infra.test.ts
git commit -m "$(cat <<'EOF'
feat: add CLI commands for infrastructure operations

bun run cli infra [bootstrap|up|outputs|ssh]
bun run cli nixos [apply|status]
bun run cli webhook [setup]

Thin wrappers around Pulumi, nixos-rebuild, and SSH. Reads hostname
from Pulumi stack outputs. All commands discoverable via --help.
EOF
)"
```

---

### Task 7: Create Pulumi project

Set up the Pulumi TypeScript project that provisions EC2 + EIP.

**Files:**
- Create: `infrastructure/pulumi/Pulumi.yaml`
- Create: `infrastructure/pulumi/Pulumi.prod.yaml`
- Create: `infrastructure/pulumi/package.json`
- Create: `infrastructure/pulumi/tsconfig.json`
- Create: `infrastructure/pulumi/index.ts`

- [ ] **Step 1: Create directory and initialize Pulumi project**

```bash
mkdir -p infrastructure/pulumi
```

- [ ] **Step 2: Create `infrastructure/pulumi/Pulumi.yaml`**

```yaml
name: forms-lab
runtime: nodejs
description: Forms Lab EC2 infrastructure
backend:
  url: s3://forms-lab-pulumi-state
```

- [ ] **Step 3: Create `infrastructure/pulumi/Pulumi.prod.yaml`**

```yaml
config:
  aws:region: us-east-1
  aws:profile: llm-class
  forms-lab:sshPublicKeyPath: ~/.ssh/id_ed25519.pub
```

Note: Adjust `sshPublicKeyPath` to match your actual SSH key. The implementor should check which key exists and use that.

- [ ] **Step 4: Create `infrastructure/pulumi/package.json`**

```json
{
  "name": "forms-lab-infrastructure",
  "type": "module",
  "dependencies": {
    "@pulumi/aws": "^6.0.0",
    "@pulumi/pulumi": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 5: Create `infrastructure/pulumi/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 6: Create `infrastructure/pulumi/index.ts`**

```typescript
import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const config = new pulumi.Config()
const sshKeyPath = config.require('sshPublicKeyPath')
const sshPublicKey = readFileSync(resolve(sshKeyPath), 'utf-8').trim()

// Look up the latest NixOS 24.11 AMI
const nixosAmi = aws.ec2.getAmi({
  mostRecent: true,
  owners: ['427812963091'], // NixOS community AMI owner
  filters: [
    { name: 'name', values: ['nixos/24.11*'] },
    { name: 'architecture', values: ['x86_64'] },
  ],
})

// SSH key pair
const keyPair = new aws.ec2.KeyPair('forms-lab-key', {
  publicKey: sshPublicKey,
})

// Security group
const sg = new aws.ec2.SecurityGroup('forms-lab-sg', {
  description: 'Forms Lab EC2 security group',
  ingress: [
    // SSH
    {
      protocol: 'tcp',
      fromPort: 22,
      toPort: 22,
      cidrBlocks: ['0.0.0.0/0'], // Restrict to your IP in production
      description: 'SSH access',
    },
    // HTTP
    {
      protocol: 'tcp',
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'HTTP',
    },
    // HTTPS
    {
      protocol: 'tcp',
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'HTTPS',
    },
  ],
  egress: [
    {
      protocol: '-1',
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'All outbound',
    },
  ],
})

// EC2 instance
const instance = new aws.ec2.Instance('forms-lab', {
  ami: nixosAmi.then((ami) => ami.id),
  instanceType: 't3.small',
  keyName: keyPair.keyName,
  vpcSecurityGroupIds: [sg.id],
  rootBlockDevice: {
    volumeSize: 30,
    volumeType: 'gp3',
  },
  tags: {
    Name: 'forms-lab',
  },
})

// Elastic IP
const eip = new aws.ec2.Eip('forms-lab-eip', {
  instance: instance.id,
  tags: {
    Name: 'forms-lab',
  },
})

// Outputs
export const instanceId = instance.id
export const publicIp = eip.publicIp
export const hostname = eip.publicDns
export const sshCommand = pulumi.interpolate`ssh root@${eip.publicDns}`
```

- [ ] **Step 7: Install dependencies**

```bash
cd infrastructure/pulumi && bun install && cd ../..
```

- [ ] **Step 8: Add `infrastructure/pulumi/node_modules` to `.gitignore`**

Check if `.gitignore` needs updating:

```bash
grep 'infrastructure' .gitignore
```

If not present, add:

```
infrastructure/pulumi/node_modules/
```

- [ ] **Step 9: Commit**

```bash
git add infrastructure/pulumi/ .gitignore
git commit -m "$(cat <<'EOF'
feat: add Pulumi project for EC2 provisioning

Provisions NixOS EC2 instance with Elastic IP, security group
(SSH, HTTP, HTTPS), and SSH key pair. S3 backend for state.
Uses AWS profile llm-class.
EOF
)"
```

---

### Task 8: Create NixOS configuration

Write the declarative NixOS config that defines the entire server state.

**Files:**
- Create: `infrastructure/nixos/flake.nix`
- Create: `infrastructure/nixos/configuration.nix`
- Create: `infrastructure/nixos/modules/users.nix`
- Create: `infrastructure/nixos/modules/caddy.nix`
- Create: `infrastructure/nixos/modules/webhook.nix`
- Create: `infrastructure/nixos/modules/app.nix`
- Create: `infrastructure/nixos/modules/deploy.nix`

- [ ] **Step 1: Create `infrastructure/nixos/flake.nix`**

```nix
{
  description = "Forms Lab EC2 NixOS configuration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    sops-nix = {
      url = "github:Mic92/sops-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, sops-nix }: {
    nixosConfigurations.forms-lab = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        sops-nix.nixosModules.sops
        ./configuration.nix
        ./modules/users.nix
        ./modules/caddy.nix
        ./modules/webhook.nix
        ./modules/app.nix
        ./modules/deploy.nix
      ];
    };
  };
}
```

- [ ] **Step 2: Create `infrastructure/nixos/configuration.nix`**

```nix
{ config, pkgs, ... }:

{
  # Basic system configuration
  system.stateVersion = "24.11";

  # Packages available system-wide
  environment.systemPackages = with pkgs; [
    git
    bun
    curl
    jq
  ];

  # Firewall
  networking.firewall = {
    enable = true;
    allowedTCPPorts = [ 22 80 443 ];
  };

  # Enable SSH
  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = "prohibit-password";
      PasswordAuthentication = false;
    };
  };

  # Timezone
  time.timeZone = "UTC";

  # Create the forms-lab service directory
  systemd.tmpfiles.rules = [
    "d /srv/forms-lab 0755 forms-lab forms-lab -"
  ];

  # Service user
  users.users.forms-lab = {
    isSystemUser = true;
    group = "forms-lab";
    home = "/srv/forms-lab";
    shell = pkgs.bash;
  };
  users.groups.forms-lab = {};

  # sops-nix for secrets
  sops = {
    defaultSopsFile = ./secrets.yaml;
    age.keyFile = "/var/lib/sops-nix/key.txt";
    secrets.github-webhook-secret = {
      owner = "forms-lab";
    };
  };
}
```

- [ ] **Step 3: Create `infrastructure/nixos/modules/users.nix`**

```nix
{ config, pkgs, ... }:

{
  users.users.root.openssh.authorizedKeys.keys = [
    # Replace with your actual SSH public key
    "ssh-ed25519 AAAA... daniel@workstation"
  ];
}
```

Note: The implementor must replace the placeholder SSH key with their actual public key from `~/.ssh/id_ed25519.pub`.

- [ ] **Step 4: Create `infrastructure/nixos/modules/caddy.nix`**

```nix
{ config, pkgs, ... }:

{
  services.caddy = {
    enable = true;
    # Global config — auto-HTTPS using the EC2 public hostname
    # The hostname is determined at deploy time and written to /srv/forms-lab/hostname
    globalConfig = ''
      auto_https disable_redirects
    '';

    # Base Caddyfile — webhook route is always present
    # Branch routes are added dynamically by the deploy script
    # via Caddy's admin API
    extraConfig = ''
      :443 {
        # The deploy script configures route blocks via admin API
        # This is the fallback
        respond "Forms Lab — no branch deployed at this path" 404
      }

      :80 {
        redir https://{host}{uri} permanent
      }
    '';
  };

  # Ensure Caddy admin API is enabled (default: localhost:2019)
  # The deploy script uses it to update routes atomically
}
```

- [ ] **Step 5: Create `infrastructure/nixos/modules/webhook.nix`**

```nix
{ config, pkgs, ... }:

{
  systemd.services.forms-lab-webhook = {
    description = "Forms Lab GitHub Webhook Listener";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab";
      Restart = "on-failure";
      RestartSec = 5;
    };

    # sops-nix decrypts the secret to a file containing the raw value.
    # script sets ExecStart to a wrapper that reads the secret into an env var.
    script = ''
      export GITHUB_WEBHOOK_SECRET=$(cat ${config.sops.secrets.github-webhook-secret.path})
      export PORT=9000
      export DEPLOY_SCRIPT=/srv/forms-lab/deploy.sh
      exec ${pkgs.bun}/bin/bun run /srv/forms-lab/main/src/webhook/main.ts
    '';
  };
}
```

- [ ] **Step 6: Create `infrastructure/nixos/modules/app.nix`**

This module doesn't create static services — the deploy script creates them dynamically. But it provides a systemd template unit that the deploy script instantiates:

```nix
{ config, pkgs, ... }:

{
  # Template unit for branch app services
  # Instantiated by the deploy script as forms-lab-app@<branch>.service
  systemd.services."forms-lab-app@" = {
    description = "Forms Lab App - %i";
    after = [ "network.target" ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      # %i is the instance name (branch name, with / replaced by -)
      WorkingDirectory = "/srv/forms-lab/%i";
      ExecStart = "${pkgs.bun}/bin/bun run src/app/main.ts";
      Restart = "on-failure";
      RestartSec = 5;

      # Environment loaded from a per-branch env file written by deploy script
      EnvironmentFile = "/srv/forms-lab/%i/.env";
    };
  };
}
```

- [ ] **Step 7: Create `infrastructure/nixos/modules/deploy.nix`**

This packages the deploy script as a Nix derivation available system-wide:

```nix
{ config, pkgs, ... }:

let
  deployScript = pkgs.writeShellScriptBin "forms-lab-deploy" ''
    set -euo pipefail

    BRANCH="$1"
    SHA="$2"
    REPO_DIR="/srv/forms-lab/repo.git"
    DEPLOY_ROOT="/srv/forms-lab"
    BRANCH_DIR="$DEPLOY_ROOT/$BRANCH"
    PORT_FILE="$DEPLOY_ROOT/ports.json"

    echo "Deploying $BRANCH at $SHA..."

    # Initialize bare repo if needed
    if [ ! -d "$REPO_DIR" ]; then
      ${pkgs.git}/bin/git clone --bare https://github.com/flexion/forms-lab.git "$REPO_DIR"
    fi

    # Fetch latest
    ${pkgs.git}/bin/git -C "$REPO_DIR" fetch origin

    # Create or update worktree
    if [ ! -d "$BRANCH_DIR" ]; then
      echo "Creating worktree for $BRANCH..."
      ${pkgs.git}/bin/git -C "$REPO_DIR" worktree add "$BRANCH_DIR" "origin/$BRANCH"
    else
      echo "Updating worktree for $BRANCH..."
      cd "$BRANCH_DIR"
      ${pkgs.git}/bin/git fetch origin
      ${pkgs.git}/bin/git reset --hard "origin/$BRANCH"
    fi

    cd "$BRANCH_DIR"

    # Install and build
    ${pkgs.bun}/bin/bun install
    ${pkgs.bun}/bin/bun run build

    # Assign port — read from ports.json or assign next available
    if [ ! -f "$PORT_FILE" ]; then
      echo '{}' > "$PORT_FILE"
    fi

    # Sanitize branch name for systemd (replace / with -)
    UNIT_NAME=$(echo "$BRANCH" | tr '/' '-')

    PORT=$(${pkgs.jq}/bin/jq -r ".[\"$BRANCH\"] // empty" "$PORT_FILE")
    if [ -z "$PORT" ]; then
      # Find next available port starting from 3001
      HIGHEST=$(${pkgs.jq}/bin/jq -r '[.[] | tonumber] | max // 3000' "$PORT_FILE")
      PORT=$((HIGHEST + 1))
      ${pkgs.jq}/bin/jq ". + {\"$BRANCH\": $PORT}" "$PORT_FILE" > "$PORT_FILE.tmp"
      mv "$PORT_FILE.tmp" "$PORT_FILE"
      echo "Assigned port $PORT to $BRANCH"
    fi

    # Write per-branch env file
    cat > "$BRANCH_DIR/.env" <<ENVEOF
    PORT=$PORT
    BASE_PATH=/$UNIT_NAME/
    ENVEOF

    # Start or restart the service
    systemctl restart "forms-lab-app@$UNIT_NAME.service" || \
      systemctl start "forms-lab-app@$UNIT_NAME.service"

    # Update Caddy config via admin API
    ${pkgs.curl}/bin/curl -s -X POST http://localhost:2019/config/apps/http/servers/srv0/routes \
      -H "Content-Type: application/json" \
      -d "{
        \"@id\": \"branch-$UNIT_NAME\",
        \"match\": [{\"path\": [\"/$UNIT_NAME/*\"]}],
        \"handle\": [{
          \"handler\": \"reverse_proxy\",
          \"upstreams\": [{\"dial\": \"localhost:$PORT\"}]
        }]
      }" || echo "Warning: Caddy config update may need manual adjustment"

    echo "Deployed $BRANCH at port $PORT (/$UNIT_NAME/)"
  '';
in
{
  environment.systemPackages = [ deployScript ];

  # Make the deploy script available at the expected path
  system.activationScripts.deployLink = ''
    ln -sf ${deployScript}/bin/forms-lab-deploy /srv/forms-lab/deploy.sh
  '';
}
```

- [ ] **Step 8: Commit**

```bash
git add infrastructure/nixos/
git commit -m "$(cat <<'EOF'
feat: add NixOS configuration for EC2 server

Declarative config for the entire server state:
- System packages (git, bun, curl, jq)
- SSH access with key-based auth
- Caddy reverse proxy with auto-HTTPS
- Webhook listener systemd service
- Template unit for per-branch app services
- Deploy script (git worktree, bun build, port assign, Caddy update)
- sops-nix for webhook secret management
EOF
)"
```

---

### Task 9: Update documentation — CLAUDE.md, catalog, knowledge-base.yaml

Update project documentation to reflect the new deployment infrastructure.

**Files:**
- Modify: `CLAUDE.md`
- Create: `catalog/architecture/deployment.md`
- Modify: `knowledge-base.yaml`

- [ ] **Step 1: Update CLAUDE.md**

Add a Deployment section after the existing Quick Reference section:

```markdown
## Deployment

```bash
bun run cli infra bootstrap     # Create S3 bucket for Pulumi state (one-time)
bun run cli infra up            # Provision/update EC2 via Pulumi
bun run cli infra outputs       # Show hostname, IP, SSH command
bun run cli infra ssh           # SSH into EC2 instance
bun run cli nixos apply         # Push NixOS config to EC2
bun run cli nixos status        # Check running services
bun run cli webhook setup       # GitHub webhook configuration guide
```
```

Update the Project Structure section to include:

```markdown
- `src/app/` — Web application (server, routes, components, public assets)
- `src/webhook/` — GitHub webhook listener service
- `src/lib/` — Shared utilities (markdown, base-path, test-helpers)
- `src/services/` — Shared services (GitHub API client)
- `src/types/` — Shared type definitions
- `src/commands/` — CLI commands (sync-stories, infra, nixos, webhook)
- `infrastructure/pulumi/` — EC2 provisioning (Pulumi TypeScript)
- `infrastructure/nixos/` — Server configuration (NixOS flake)
- `catalog/` — Catalog content (personas, stories, decisions, architecture, experiments)
- `projects/` — Form project directories (specs + assets)
- `test/` — Test files
- `scripts/` — Build scripts
- `notes/` — Session logs and exploration notes
- `dist/` — Built assets (gitignored)
```

- [ ] **Step 2: Create `catalog/architecture/deployment.md`**

```markdown
---
status: working
tags: [infrastructure, deployment, architecture]
---

# Deployment Architecture

How the forms-lab application is deployed and served.

## Overview

A single EC2 instance hosts all branch deployments. GitHub push webhooks trigger automated deploys. NixOS declaratively manages the server state — Caddy reverse proxy, per-branch application processes, and the webhook listener. Pulumi provisions the AWS resources.

## How It Works

1. **Push to GitHub** — A developer pushes to any branch.
2. **Webhook fires** — GitHub sends a push event to the webhook listener on EC2.
3. **Deploy script runs** — The listener validates the signature and spawns the deploy script.
4. **Build and serve** — The script creates/updates a git worktree, runs `bun install && bun run build`, starts/restarts the systemd service, and updates Caddy routing.
5. **Traffic routes** — Caddy proxies `/<branch>/` to the branch's Bun process on its assigned port.

## Components

| Component | Location | Role |
|-----------|----------|------|
| Pulumi project | `infrastructure/pulumi/` | Provisions EC2, EIP, security group |
| NixOS config | `infrastructure/nixos/` | Declares entire server state |
| Webhook listener | `src/webhook/` | Receives GitHub push events |
| Deploy script | `infrastructure/nixos/modules/deploy.nix` | Builds and deploys branches |
| Caddy | NixOS service | Reverse proxy, auto-HTTPS, routing |
| App services | systemd template units | Per-branch Bun processes |

## URL Scheme

Each branch is served at a subpath on the EC2 hostname:

- `https://<hostname>/main/` — main branch
- `https://<hostname>/slice-1/` — slice-1 branch

The app reads `BASE_PATH` to generate correct links and asset URLs.

## Operations

All operations are available through the CLI:

```bash
bun run cli infra up         # Provision/update infrastructure
bun run cli nixos apply      # Push NixOS changes to server
bun run cli nixos status     # Check running services
bun run cli webhook setup    # GitHub webhook configuration
```

## Sources

- [EC2 with Pulumi](../decisions/infrastructure/ec2-with-pulumi.md)
- [Caddy reverse proxy](../decisions/infrastructure/caddy-reverse-proxy.md)
- [GitHub webhook deploys](../decisions/infrastructure/github-webhook-deploys.md)
- [Subpath routing](../decisions/infrastructure/subpath-routing.md)
- [Nix-built processes](../decisions/infrastructure/nix-built-processes.md)
- Canonical code: `infrastructure/pulumi/`, `infrastructure/nixos/`, `src/webhook/`
```

- [ ] **Step 3: Update `knowledge-base.yaml`**

Add `infrastructure/**` to the writes allow list:

```yaml
rules:
  writes:
    allow: ["catalog/**", "src/**", "test/**", "notes/**", "scripts/**", "infrastructure/**"]
    deny: ["infrastructure/secrets/**"]
```

- [ ] **Step 4: Run lint to ensure docs are clean**

```bash
bunx @biomejs/biome check .
```

Expected: no errors on the new/modified files.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md catalog/architecture/deployment.md knowledge-base.yaml
git commit -m "$(cat <<'EOF'
docs: add deployment architecture and update project docs

New catalog/architecture/deployment.md explains the deployment system
with component overview, URL scheme, and operations reference. Links
to all five infrastructure ADRs per provenance policy.

Update CLAUDE.md with deployment CLI commands and revised project
structure. Add infrastructure/** to knowledge-base.yaml write rules.
EOF
)"
```

---

### Task 10: Update biome config and final verification

Ensure biome, tsconfig, and CI cover the new files.

**Files:**
- Modify: `biome.json`
- Verify: `tsconfig.json`
- Verify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update biome.json includes**

Check if `infrastructure/**` needs adding. The Pulumi code in `infrastructure/pulumi/` is a separate TypeScript project with its own tsconfig, so it may make sense to exclude it from the main biome config. Check current includes:

```json
"files": {
  "includes": ["src/**", "test/**", "scripts/**"]
}
```

This already covers `src/app/**` and `src/webhook/**`. No change needed — infrastructure code has its own tooling.

- [ ] **Step 2: Verify tsconfig.json**

The current include is `["src/**/*", "test/**/*"]`. This covers `src/app/**/*` and `src/webhook/**/*`. No change needed.

- [ ] **Step 3: Verify CI workflow**

The CI uses `bun run build`, `bun test`, `tsc --noEmit`, and `biome check .`. All still work with the new paths since package.json scripts were updated in Task 1. No change needed.

- [ ] **Step 4: Run full verification**

```bash
bun run build
bun test
bun run --no-warnings tsc --noEmit
bunx @biomejs/biome check .
bun run dev  # verify server starts, check http://localhost:3000
```

Expected: all pass, server starts correctly.

- [ ] **Step 5: Commit any remaining fixes**

If any issues were found in Step 4, fix and commit:

```bash
git add -A
git commit -m "fix: resolve issues found during final verification"
```

---

## Checklist: Spec Coverage

| Spec Section | Task(s) |
|---|---|
| Repository Reorganization | Task 1 |
| Pulumi Infrastructure | Task 7 |
| NixOS Configuration | Task 8 |
| Webhook Listener Service | Tasks 4–5 |
| BASE_PATH Support | Tasks 2–3 |
| Developer Interface & CLI | Task 6 |
| Documentation (CLAUDE.md, catalog, kb.yaml) | Task 9 |
| Final verification | Task 10 |
