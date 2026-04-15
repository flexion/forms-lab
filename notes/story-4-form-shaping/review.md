# Story 4 Code Review

**Date:** 2026-04-15
**Branch:** story-4/form-shaping
**Reviewer:** superpowers:code-reviewer subagent
**Scope:** Command-based form shaping (rebuild of first-round full-spec-rewrite approach)

## AC Coverage

| AC | Status | Notes |
|---|---|---|
| View current FormSpec | Met | `GET /:owner/:slug/edit` |
| Describe changes in natural language | Met | Intent textarea → `POST /intent` |
| LLM proposes concrete FormSpec edits | Met | Tool-use commands, schema + executor validation |
| Clear before/after of proposed changes | Partial | Humanized command list is the diff. Composable and honest; commands *are* the diff. No literal side-by-side visualization. Deliberate design. |
| Accept / reject proposed changes | Met | Accept/reject/refine buttons |
| Manual fine-tune (reorder, move groups, delivery modes) | Partial | Page up/down swap and delivery mode select are in the UI. Group-move between pages works via the LLM but has no direct UI surface. Tracked as follow-up. |
| LLM suggests delivery modes based on section complexity | Partial | LLM can emit `setDeliveryMode` commands via tool use; no dedicated suggest-modes button. Tracked as follow-up. |
| Live preview shows what Carlos would see | Met (simplified) | Iframe reloads after accept/execute. Preview is simplified HTML (title + group titles + field labels), not full `flex-form-page` rendering. Sufficient for v1. |
| Changes saved to FormSpec | Met | Git commit per batch + structured shaping log |

## Strengths

- **Exemplary executor decomposition.** `commands.ts`, `executor.ts`, `humanize.ts`, `projector.ts`, `tools.ts`, `bedrock-shaper.ts` cleanly separate concerns. Pure functions, discriminated unions, atomic batch rollback.
- **Strong domain-core test coverage.** 32+ executor tests covering page/group/field commands + batch rollback.
- **Defense-in-depth on the LLM boundary.** AI SDK tool-use → per-command Zod schemas → server-side `commandSchema.parse()` → executor semantic validation → commit.
- **Git-backed audit trail with structured shaping log** — every edit reconstructable both via git and via `forms/default/shaping-log.json`.
- **Pivot discipline.** First-round full-rewrite approach was cleanly deleted; history shows the pivot; threat model has a dated changelog entry.

## Issues Found and Resolved

### Critical / Fix-before-merge
1. **Preview iframe never reloaded** after accept/execute (broke live-preview AC). **Fixed:** added `reloadPreview()` in `broadcastSpec()` using cache-busting query param. Commit `46f9f0a`.
2. **Orphaned first-round components** (`flex-sortable-list`, `flex-preview-panel`) registered in build but not used by new editor. **Fixed:** directories deleted, registry + CSS imports cleaned up. Commit `3f6709f`.
3. **XSS via `</script>` in JSON bootstrap** — group/page titles flow from LLM output to `<script type="application/json">` bootstrap. **Fixed:** `safeJsonForScript()` helper escapes `<` as `\u003c`. Commit `fb7c433`.

## Remaining Concerns

### Deferred to follow-up

- **Group-move UI**: command exists, no drag/dropdown in `flex-form-structure`. Maya must describe the move in natural language.
- **LLM suggest-modes UI**: no dedicated button that sends a canned "suggest delivery modes for complex sections" prompt. Folded into generic tool surface.
- **Humanizer duplication** between `services/forms/shaping/humanize.ts` and inlined `describe()` in `flex-command-proposal/client.ts`. Driven by P2 dependency rule. Cleanest long-term fix is moving `commands.ts` + `humanize.ts` to `src/shared/shaping/`, which also resolves the next item.
- **`import type` exclusion in dependency-rule test** needs an ADR amendment per CLAUDE.md.
- **Playwright behavioral tests** for custom elements — none. Reasonable for v1 since executor and service methods are well-tested; would catch issues like the preview reload bug caught in review.
- **Integration tests for JSON routes** (`/intent`, `/accept`, `/execute`) — none. Reasonable for v1; `/accept` is the tamper-relevant endpoint and would benefit from at least a 403/400 regression test.
- **Optimistic concurrency** — no expected-base-sha guard on `/accept`; two tabs could confuse. Acceptable for single-user v1.
- **LLM cost abuse and prompt injection via `previousAttempt.feedback`** — not in threat model. Low severity (attacker must already be the project owner). Worth adding a line to the threat model.
- **`authorCommit` field in shaping log is always empty** because it's assigned after serialization. Minor; drop or backfill in a follow-up.

## Test Results

- 599 tests passing, 0 failing
- `bun run check` clean (lint + type check + tests)
- Pre-existing lint warnings in unrelated files (flex-combo-box aria attrs, noExplicitAny in older test files)

## Assessment

**Ready for PR.** The command-based architecture is the right shape for this problem. The three critical issues surfaced in review were fixed in place. The deferred items are honest scope gaps that warrant follow-up work but don't block landing the foundation.
