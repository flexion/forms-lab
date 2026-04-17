---
status: stable
tags: [architecture, design-system, shaping, git]
decided: 2026-04-17
---

# Unified staged buffer for direct and LLM-assisted edits

Direct-manipulation edits from the WYSIWYG editors and LLM-proposed batches from the chat assistant share a single client-side staged buffer. Maya commits the whole buffer with one click; the server writes exactly one git commit per Save via `POST /edit/save`.

## Context

PR #42 (form shaping) had two commit endpoints:

- `POST /edit/execute` — manual commands emitted from the structure sidebar (page reorder, delivery mode) — one git commit per command.
- `POST /edit/accept` — LLM-proposed batches from the chat assistant — one git commit per accepted batch.

PR #54 added direct-manipulation WYSIWYG editors for the other ~20 command kinds (rename a field, toggle required, add a group, change a delivery mode, etc.). Extending the `/edit/execute` model to every keystroke would have produced a commit-per-keystroke history and eroded the atomic-batch guarantee that made the original executor valuable. It also would have kept LLM-originated edits and direct edits on separate paths, contradicting the "one foundation for both" claim in the [command-based shaping decision](command-based-shaping.md).

## Decision

**One staged buffer.** `flex-form-editor` holds a `Command[]` buffer. Every edit — whether from a WYSIWYG editor's event or from the chat assistant's Accept — dispatches `formeditor:stage-command` (single) or `formeditor:stage-batch` (many) and the coordinator appends to the buffer.

**Projected state, not canonical state.** The coordinator keeps both canonical state (last committed) and projected state (canonical + buffer). Editors re-render from the projected state on every `formeditor:state-projected` event. Maya sees what the form will look like after Save, before committing.

**One commit endpoint.** `POST /edit/save` is the only path that writes to git. Body: `{ commands, parentSha, summary?, source }`. The server parses every command with `commandSchema`, runs the executor, and writes one commit whose message is a per-command humanize join (optionally prefixed with a caller-supplied summary for chat-originated batches).

**`parentSha` optimistic concurrency.** `/edit/save` returns `409 { error: 'stale', currentSha }` if `parentSha` doesn't match the project's current sha. Two tabs can no longer silently clobber each other.

**`source` preserves audit distinction.** The shaping log records whether a commit originated from direct manipulation (`manual`), LLM assistance (`llm`), or a mix (`manual` when mixed, because the chat batch's contribution is one line among many). `/edit/accept` and `/edit/execute` were removed.

## Consequences

- A single Save commit can include direct edits and LLM-accepted batches interleaved. The commit message humanizes each command, with the LLM's explanation included as a summary prefix when the batch came from chat.
- The buffer lives in client memory. A page reload loses it. `beforeunload` warns when the buffer is non-empty.
- Discard clears the buffer and reprojects from canonical state.
- The `parentSha` guard is simple and correct: no row-level locking, no 3-way merge — just a fresh sha comparison per Save.
- Pattern generalizes: any future editor-style UI that wants atomic batch commits with mixed interaction sources can reuse the buffer + single-save shape.

## Sources

- Design note: [`notes/2026-04-16-direct-edit-ui-design.md`](../../../notes/2026-04-16-direct-edit-ui-design.md) (in-repo)
- Code: `src/entrypoints/app/routes/owner/edit/index.tsx` (`/edit/save`), `src/design-system/components/flex-form-editor/`, `flex-staged-changes/`
- Related: [Command-based form shaping](command-based-shaping.md), [Coordinator custom elements](coordinator-custom-elements.md)
