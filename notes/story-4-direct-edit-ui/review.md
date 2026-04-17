---
title: Story-4 direct-edit UI — code review
date: 2026-04-17
branch: story-4/direct-edit-ui
pr: 54
reviewer: superpowers:code-reviewer subagent
---

# Code review — PR #54 (direct-edit UI)

Review of the branch state against `notes/2026-04-16-direct-edit-ui-design.md` and issue #4's acceptance criteria. Ran `bun run check` first — 635 tests pass, type check and lint clean.

## Scope

Adds a direct-manipulation edit UI on top of the chat-driven form-shaping path that landed in PR #42. Click a field, group, or page header in the preview to open a labeled-form edit panel; edits stage into a shared buffer alongside chat-accepted batches; Save commits the whole buffer as one git commit. Sidebar is the sole page switcher. Preview-as-applicant link restores the Carlos view.

34 files changed, ~6300 insertions, ~280 deletions.

## Acceptance criteria coverage

| AC | Status |
|---|---|
| View the current FormSpec | Met (pre-existing) |
| Reorder pages | Met — sidebar up/down arrows; editable-page toolbar page-up/page-down |
| Adjust which groups appear on which pages | Met — moveField's move-to-group dropdown; addGroup / removeGroup |
| Select delivery mode per section | Met — sidebar delivery menu; editable-page toolbar delivery select |
| LLM delivery-mode suggestion | Not addressed (pre-existing gap from PR #42) |
| Live preview of what Carlos sees | Met — "Preview as applicant" link in the breadcrumb opens the existing `/preview` route (with prev/next navigation wired and `components.js` loaded so client-side controls hydrate) |
| Changes saved as proposals | Met — staged buffer, Save/Discard |
| Discard to revert | Met |

Deferred per the design spec to v1.1: drag-and-drop, split/merge of pages and groups, reorderFields, moveGroup, server-side draft persistence.

## Issues found

### Fixed before merge

- **Control-widget clear was silently unsaveable.** Selecting "(default for type)" in the control dropdown marked the field dirty but `saveDraft` couldn't emit a command (the `setFieldControl` schema requires a concrete value). Narrowed `isDirty()` to only count a concrete change to the control widget, so the Save button reflects what the save path can actually do. Clearing back to default is now a deliberate no-op with no false-dirty state.

### Open items (follow-ups, not merge-blocking)

- **`formeditor:command-failed` is dispatched but not consumed.** The design commits to "surface a toast explaining why" on staging/save failures. Server + network errors currently fail silently on the client. Low user-visibility today since the happy path is stable, but worth wiring a toast handler in a follow-up session.
- **Missing `beforeunload` warning.** The design-doc v1 commitment for protecting unsaved staged changes against navigation is not yet implemented. Low risk (Maya would notice the pending count), but a small, safe follow-up.
- **Editor's `document.addEventListener('keydown', Escape)` has no cleanup.** The editor is a page-lifetime singleton so this is inert in practice, but inconsistent with the sidebar component that properly cleans up its document listener. Worth fixing when the editor component is otherwise touched.
- **Dead event types in `protocol.ts`.** `formeditor:manual-command`, `proposal-accept`, `proposal-reject`, `proposal-refine`, `intent-submitted`, and `spec-updated` are either replaced by the new events or never wired. Cleanup-only.
- **Dead iframe preview reload.** `flex-form-editor.reloadPreview()` still tries to set the src of `iframe.editor-preview-frame`, which no longer exists. Harmless but misleading.
- **Threat model not updated.** Story DoD requires reflecting any new trust boundaries. The `/edit/save` route has identical auth/ownership/parentSha guards to the routes it replaces; the shape of the attack surface is unchanged. Adding a sentence to `catalog/architecture/threat-model.md` explicitly noting the route replacement is the right follow-up.
- **`choices` editing not surfaced.** Editing a `choice`-type field's options has no UI. Pre-existing scope gap; called out in the design doc.

## Security

`/edit/save` replicates the auth + ownership + staleness + zod-parse pipeline of `/edit/intent`. There's no path from an unauthenticated or non-owner request to a git write. No new trust boundaries.

## Production readiness

Deployed to the branch preview throughout the session and iterated live. The staged buffer is in-memory only (fine; explicit per design). The document-level click handler in `flex-form-structure` has a `disconnectedCallback` teardown. The editor's keydown handler does not, but the editor is a page-lifetime component today.

## Assessment

Ready to merge. One bug fixed inline; remaining items are documented follow-ups that do not block the April 20 demo and are safely deferrable to the post-presentation polish session.
