# Story 5 Review Summary

**Date:** 2026-04-17
**Branch:** story-5/review-changes

## Acceptance Criteria Coverage

From issue #5:

- [x] Branch model: `main` published; named branches are working copies
- [x] `main` read-only in editor; must create/select branch to edit
- [x] Branch indicator and switcher in editor header (`flex-branch-indicator`, `flex-branch-switcher`)
- [x] Change indicators on modified resources (`flex-change-indicator`)
- [x] PR-style review page at `/:owner/:slug/compare/:base...:branch`
- [x] Structural semantic diff for DataCollectionSpec and FormSpec
- [x] Domain-aware diff descriptions (ADDED/REMOVED/MODIFIED/MOVED/RENAMED with prose)
- [x] Command log shown as History tab
- [x] Side-by-side rendered previews
- [x] Approve (fast-forward merge) and reject (close) actions
- [x] Comments on review pages (git-backed, threadable)
- [x] Branch-qualified form URLs (`/forms/:specId/branches/:branch`) with preview banner
- [x] Non-production form banner component
- [x] Submissions reference commit SHA via `specVersion`

## Architectural Review

- **Dependency direction holds.** `shared → services → entrypoints` preserved. Architecture dependency-rule test passes.
- **Services own their types (P3).** `SpecChange`, `ReviewRef`, `MergeOutcome`, `BranchEntry` live with the service that produces them.
- **Presentation stateless (P4).** `flex-semantic-diff` defines its own contract; the route adapts domain `SpecChange` to component input, not the other way around.
- **Intent-revealing names (P1).** `compareSpecs`, `ReviewService`, `BranchIndicator`, no framework mechanism bleed-through.

## Issues Found and Resolved

From the final cross-cutting review:

- **Critical**: POST /compare/:range/merge and /close were unauthenticated. Fixed in `6e56a5c` — now requires auth + ownership; tests added for 401 and 403 paths.
- **Important**: `createFormRouter` was not mounted in `server.tsx`, leaving branch-qualified form URLs unreachable. Fixed in `2d4e98f` — router mounted with a git-backed `getSpecs` adapter; async contract threaded through.

From per-task code reviews:

- **Delivery mode "undefined"** produced awkward diff text. Fixed with "unset" fallback in `02325c6`.
- **Multi-attribute field changes** test added to lock in single-change invariant (`33e246c`).
- **Scope comments** added to each differ so future contributors know what's explicitly not compared.

## Remaining Concerns (non-blocking)

- **specId -> (owner, slug) lookup** is O(N) scan on cold-start. Fine at demo scale; optimize before scale.
- **In-memory session/submission gateways** don't persist across restarts. Pre-existing pattern from story-4 era; not a story-5 regression.
- **Merge-conflict UX** shows JSON-ish 409 response. Could become an HTML error page in a follow-up.
- **Comments write path** is read-modify-write without optimistic concurrency. Single-writer workflow so not a practical concern today, but document or lock before multi-writer reviews.
- **Minor a11y** warnings on `<nav role="tablist">` in compare page (no JavaScript tab panels, so role is misleading).

## Security Notes

- All destructive compare actions now require owner authorization via `ProjectService.getProject(..., isOwner)`.
- Comments require authenticated user (any authenticated user can comment; ownership not required — collaborative affordance).
- No new trust boundaries introduced. Threat model does not need updates for this story.

## Test Coverage

- 691 tests, 0 failures
- New unit coverage: comparison differs (15 tests), review service (8 tests), project-service branches (10 tests), comments store (3 tests), form-project-repo branches (8 tests)
- E2E integration test walks create-branch -> edit -> compare -> merge through HTTP handlers, including auth rejection paths

## Recommendation

Ready for review and merge.
