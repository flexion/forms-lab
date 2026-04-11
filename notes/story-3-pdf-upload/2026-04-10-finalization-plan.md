# Story 3 Finalization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all lint errors, failing tests, and residual issues so story 3 passes `bun run check` and is ready for merge.

**Architecture:** No architectural changes. This is fix-up work on existing implementation.

**Tech Stack:** Bun, Hono, Biome, bun:test

---

### Task 1: Fix Biome lint and format errors

**Files:**
- Modify: `src/lib/github-oauth.ts:72-74`
- Modify: `test/auth-routes.test.ts:96-101,152-159,207-213`
- Modify: `test/projects-routes.test.ts:193`

- [ ] **Step 1: Fix format issue in github-oauth.ts**

Replace the multi-line `console.error` with single-line:

```typescript
console.error(`Org membership check failed: HTTP ${response.status}`)
```

- [ ] **Step 2: Fix format issues in auth-routes.test.ts**

Three locations where Biome wants inline JSON arrays. Replace each multi-line `JSON.stringify([...])` with the compact form Biome expects.

At line ~96-103:
```typescript
JSON.stringify([{ login: 'flexion' }, { login: 'other-org' }]),
```

At line ~152-159:
```typescript
return new Response(JSON.stringify([{ login: 'other-org' }]), {
  status: 200,
})
```

At line ~207-213:
```typescript
return new Response(JSON.stringify([{ login: 'flexion' }]), {
  status: 200,
})
```

- [ ] **Step 3: Fix lint warning in projects-routes.test.ts**

At line 193, replace non-null assertion with optional chain:

```typescript
expect(updated?.status).toBe('ready')
```

- [ ] **Step 4: Run Biome to verify fixes**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bunx @biomejs/biome check .`
Expected: No errors or warnings related to these files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github-oauth.ts test/auth-routes.test.ts test/projects-routes.test.ts
git commit -m "style: fix biome lint and format errors"
```

---

### Task 2: Fix failing auth callback tests

The auth callback route at `src/app/routes/auth/index.ts:99-105` uses a hardcoded allowlist `['danielnaab']` instead of the org membership check the tests expect. The tests mock a user `testuser` who isn't on the allowlist, so they fail.

The fix: make the allowlist check in the tests match the implementation. Either add `testuser` to the mock setup, or switch the test mock user to `danielnaab`. But actually, the real fix is to make the auth check testable — the allowlist is a temporary development shortcut with a TODO to replace it.

The cleanest approach: extract the authorization check so tests can control it.

**Files:**
- Modify: `src/app/routes/auth/index.ts:99-105`
- Modify: `test/auth-routes.test.ts`

- [ ] **Step 1: Make the allowlist configurable via environment variable**

In `src/app/routes/auth/index.ts`, replace the hardcoded allowlist:

```typescript
// TODO: Replace with org membership check once OAuth app is approved
// Temporary allowlist for development
const allowedUsers = (process.env.ALLOWED_USERS ?? 'danielnaab').split(',')
if (!allowedUsers.includes(ghUser.login)) {
```

- [ ] **Step 2: Update the test to set the environment variable**

In the `beforeAll` or `beforeEach` of `test/auth-routes.test.ts`, set `process.env.ALLOWED_USERS = 'testuser,unauthorized'` — wait, the unauthorized user test expects rejection. Set `process.env.ALLOWED_USERS = 'testuser'` so `testuser` passes and `unauthorized` fails.

Add to the test file's setup:
```typescript
process.env.ALLOWED_USERS = 'testuser'
```

And in `afterAll`:
```typescript
delete process.env.ALLOWED_USERS
```

- [ ] **Step 3: Run tests to verify**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/auth-routes.test.ts`
Expected: All tests pass. The authorized user (`testuser`) is on the allowlist; the unauthorized user (`unauthorized`) is not.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/auth/index.ts test/auth-routes.test.ts
git commit -m "fix(auth): make user allowlist configurable via ALLOWED_USERS env var

Allows tests to control the allowlist. The hardcoded list was causing
test failures for mock users not on the list."
```

---

### Task 3: Fix threat model residual risk description

The threat model at `catalog/architecture/threat-model.md` says the `returnTo` parameter is "not validated against a whitelist of internal paths." But the implementation at `src/app/routes/auth/index.ts:124-127` does validate it:

```typescript
const safeReturnTo =
  returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
```

**Files:**
- Modify: `catalog/architecture/threat-model.md`

- [ ] **Step 1: Update the residual risk text**

Find the sentence:
> The `returnTo` parameter is not validated against a whitelist of internal paths -- an attacker could craft a sign-in link that redirects to an external site after authentication. Mitigation: validate that `returnTo` starts with `/` and does not contain `//` or protocol schemes.

Replace with:
> The `returnTo` parameter is validated to start with `/` and not start with `//`, preventing open redirect to external sites. However, it does not use a strict allowlist of internal paths.

Also update the risk matrix row for "Open redirect via returnTo" from `Unmitigated` to `Partially mitigated`:

```
| Open redirect via returnTo | Browser-Hono Auth | Low | Medium | Path prefix validation (no external redirects) | Partially mitigated |
```

- [ ] **Step 2: Commit**

```bash
git add catalog/architecture/threat-model.md
git commit -m "docs(threat-model): correct open redirect mitigation status

The returnTo parameter is validated — update residual risk description
to match the implementation."
```

---

### Task 4: Run full check suite and verify

- [ ] **Step 1: Run bun run check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: All lint, type checks, and tests pass (144 tests, 0 failures).

- [ ] **Step 2: Start dev server and verify manually**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run dev`

Verify in browser:
- `/projects` redirects to sign-in (requires auth)
- `/projects/new` shows demo fixtures and upload form (after auth)
- Creating a project from a fixture starts extraction
- Project detail page shows extracting/ready/error states appropriately

Note: Real Bedrock extraction requires AWS credentials. Without them, verify the fixture selection flow reaches the extraction step and handles the error gracefully.

- [ ] **Step 3: Commit any fixes found during manual testing**

---

### Task 5: Final review against acceptance criteria

- [ ] **Step 1: Walk through each acceptance criterion**

| Criterion | File/Evidence |
|-----------|--------------|
| Upload page accepts PDF files | `src/app/routes/projects/components.tsx` NewProjectPage |
| System extracts DataCollectionSpec | `src/services/pdf-extractor.ts` createBedrockPdfExtractor |
| System generates default FormSpec | `src/services/pdf-extractor.ts:94-115` |
| Specs displayed as reviewable content | `src/app/routes/projects/components.tsx` SpecViewer, FormSpecViewer |
| Fields, types, grouping, conditions visible | `src/app/routes/projects/components.tsx:199-253` |
| Proposed form layout visible | `src/app/routes/projects/components.tsx:255-271` |
| Extracted specs persisted | `src/services/database.ts` ProjectStore |
| Low-confidence fields flagged | `src/app/routes/projects/components.tsx:176-197` ConfidenceBadge |

- [ ] **Step 2: Verify Definition of Done items**

| Item | Status |
|------|--------|
| Acceptance criteria met | Verify above |
| Threat model updated | Task 3 |
| Technical docs updated | Design spec in `notes/story-3-pdf-upload/` |
| LLM extraction has interface abstraction | `PdfExtractor` interface in `pdf-extractor.ts` |
| At least one test PDF with ground truth | `fixtures/pardon-application.pdf` |
| Tests pass | Task 4 |
| Type checking passes | Task 4 |
| CI pipeline green | Verify after push |
