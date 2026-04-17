---
title: Direct edit UI for form shaping
status: draft
date: 2026-04-16
story: 4
branch: story-4/direct-edit-ui
---

# Direct edit UI for form shaping

## Goal

Add a direct-manipulation edit UI to `/:owner/:slug/edit` so Maya can shape pages, groups, and fields without typing into the chat assistant. The chat remains for higher-level intents ("split this into two pages by topic"). Both paths share one **staged proposal** buffer that Maya commits via **Save** or drops via **Discard**.

## Why now

Story 4 (PR #42) shipped the chat-driven form-shaping path with a 25-command executor and a three-panel editor (structure sidebar / preview iframe / assistant chat). The structure sidebar exposes only page reorder and delivery mode; the other 23 commands require Maya to type intents into the chat. That is friction for routine edits (rename a field, mark something required) and contradicts story-4's acceptance criteria around "live preview updates as Maya edits the FormSpec." This work closes that gap before the April 20 final presentation.

## Scope

In scope (v1):

- Direct UI for the high-frequency commands across pages, groups, and fields: `renamePage`, `addPage`, `removePage`, `setDeliveryMode`, `swapPages`, `renameGroup`, `addGroup`, `removeGroup`, `addField`, `removeField`, `relabelField`, `setRequired`, `changeFieldType`, `setFieldControl`, `setFieldSensitivity`, `setFieldCondition` (clear + basic three-input set), `moveField`.
- Editable preview in place of today's read-only iframe; one page visible at a time.
- Shared **staged buffer** in the editor; Save commits one git commit per batch with a humanized message; Discard drops the buffer.
- Chat assistant Accept stages into the same buffer.
- Inline-expand for less-common controls (sensitivity, control widget, condition, move-to-group).

Out of scope (deferred to v1.1):

- `splitPage`, `mergePages`, `splitGroup`, `mergeGroups` — require multi-select UX that doesn't exist yet. Available via chat assistant in the meantime.
- `reorderPages`, `movePage` — chained `swapPages` via the arrow buttons covers the common case.
- `reorderFields`, `moveGroup` — pattern matches `moveField`; add when needed.
- Drag-and-drop (fast follow; arrows + dropdowns suffice for v1).
- Server-side draft persistence — buffer is client-only; `beforeunload` warns on navigation.
- Publish flow (story-5).
- Live preview of conversational delivery mode.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Where does the new edit UI live? | **C** — editable preview in place of the iframe |
| 2 | Where do less-common controls live? | **A** — inline expand below the row |
| 3 | Page scope visible at once | **A** — one page at a time, with page tabs |
| 4 | Save model | **B** — stage in-memory, explicit Save |
| 5 | Chat coexistence | **A** — unified buffer; chat Accept stages too |
| 6 | Drag-and-drop scope | **A** — none in v1; arrows and dropdowns |

## Architecture

### Existing system (post story-4)

- `src/entrypoints/app/routes/owner/edit/index.tsx` defines four routes: `GET /edit`, `POST /edit/intent` (LLM shaping), `POST /edit/accept` (commit a batch), `POST /edit/execute` (commit one), `POST /edit/undo` (git revert).
- `src/services/forms/shaping/executor.ts` applies a `Command[]` to a `ProjectState` and writes a single commit per batch.
- `src/services/forms/shaping/humanize.ts` formats batches into commit messages.
- `src/design-system/components/flex-form-editor/` is the root web component holding three panels and the `formeditor:*` event protocol.
- `src/design-system/components/flex-form-structure/client.ts` renders the left sidebar; emits `formeditor:manual-command` for page reorder and delivery mode changes; the editor relays these to `POST /edit/execute`.
- `src/design-system/components/flex-assistant/client.ts` runs the chat loop, calling `/edit/intent` then `/edit/accept`.

### Three changes

**1. Replace the iframe with `<flex-editable-page>`.** A new web component renders the current page inline using the existing `FormPageView` markup as the visual base, then layers edit affordances. Inline rendering is required so the parent editor can react to selection and project state changes against the staged buffer. The iframe-based read-only preview at `GET /preview?page=N` survives unchanged for embedding elsewhere.

**2. Reuse the existing pure executor for staging.** `src/services/forms/shaping/executor.ts` already exports `executeBatch(state, commands)` that returns `{ ok, state }` or `{ ok: false, failedAt, command, error }` without touching git. The editor client and the new `/edit/save` route both call it. No new service file is needed. The editor holds the staged batch in client memory; on Save it `POST`s the full batch to `/edit/save`; the route applies and commits exactly once via `service.executeCommands` (which also calls `executeBatch` internally — confirmed by re-reading `src/services/project-service.ts`).

**3. Unify the chat path.** `flex-assistant`'s Accept button stops calling `/edit/accept` and instead dispatches `formeditor:stage-batch` carrying the LLM's commands plus its `explanation` (used as the chat-batch summary in the staged-changes popover). The existing `/edit/intent` endpoint is unchanged. The new `POST /edit/save` is the single commit path; `/edit/accept` and `/edit/execute` are removed.

### Commit messages

`service.executeCommands` already takes a single `explanation: string` per batch. The save endpoint composes that explanation server-side: it joins per-command `humanize(command, state)` results with newlines, prepended by an optional caller-supplied summary. For chat-originated batches the client passes the LLM's `explanation` as the summary; direct-edit batches pass nothing and the joined humanize lines stand alone. This keeps the existing executor signature and produces multi-line commits like:

```
Edit form: Maya's session

- Rename field "First name" to "Given name"
- Mark field "Email" required
- Add page "Verification" after "Income"
```

### Dependency direction

New code follows `shared → services/data-collection → services/forms → design-system → entrypoints`. No new cross-cutting modules. `test/architecture/dependency-rule.test.ts` continues to enforce.

## Components

### New web components (under `src/design-system/components/`)

- **`flex-editable-page/`** — renders the current page; owns the page-tabs strip at top, the page-level toolbar (rename, split, delivery mode select, +group, delete page, +add page), and group/field children. Listens for `formeditor:state-projected` and re-renders. Dispatches `formeditor:stage-command` with `{ command, explanation }`.
- **`flex-editable-field/`** — one field row: inline-editable label, chips for type / required / delete; "…more" expander revealing sensitivity, control widget, condition, move-to-group dropdown, change-field-type dropdown.
- **`flex-editable-group/`** — group header with inline rename, +field button, delete, split, merge dropdown.
- **`flex-staged-changes/`** — popover anchored to the breadcrumb's **Save (N)** button: lists pending commands using the existing `humanize` formatter and lets Maya drop individual entries from the batch.

### Modified components

- **`flex-form-editor/`** — owns the staged buffer (`Command[]`). Handles `formeditor:stage-command` (append + reproject) and `formeditor:stage-batch` (append all + reproject). Dispatches `formeditor:state-projected` after each change. Save handler: `POST /edit/save` with the buffer, on 200 replace canonical state and clear buffer; Discard handler: clear buffer + reproject from canonical state.
- **`flex-form-structure/`** — its existing `formeditor:manual-command` emissions become `formeditor:stage-command`. Otherwise unchanged. UI gains a "(N pending)" hint in the breadcrumb.
- **`flex-assistant/`** — Accept button dispatches `formeditor:stage-batch` with the LLM's commands and its explanation. Chat input remains enabled at all times.

### Routes

- `POST /:owner/:slug/edit/save` — **new**. Body: `{ commands: Command[], parentSha: string, summary?: string, source: 'manual' | 'llm' }`. Validates with `commandSchema`, asserts `parentSha` matches the project's current sha, composes the commit explanation as `[summary, ...commands.map(c => humanize(c, state))].filter(Boolean).join('\n')`, calls `service.executeCommands(...)`, returns `{ state, sha }`. On error returns `{ failedAt, command, error }`. On stale parent returns `409 { error: 'stale', currentSha }`. `source` is `'llm'` only when the buffer holds exactly one chat-staged batch and no inline edits; otherwise `'manual'` (so the existing `ShapingLogEntry['source']` union doesn't change).
- `POST /:owner/:slug/edit/intent` — unchanged (LLM shaping).
- `POST /:owner/:slug/edit/accept` — **removed**.
- `POST /:owner/:slug/edit/execute` — **removed**.
- `POST /:owner/:slug/edit/undo` — unchanged (git revert).
- `GET /:owner/:slug/edit` — unchanged shape; the initial state script still ships `formSpec` and `dataSpec`. Adds `currentSha` so the client can include it in `/edit/save`.

## Data flow

### Single inline edit

1. Maya types into a label → `flex-editable-field` debounces 400ms → dispatches `formeditor:stage-command` with `{ kind: 'relabelField', id, label }` and explanation `Rename "Old" to "New"`.
2. `flex-form-editor` appends to its `Command[]` buffer, runs the staging service against the canonical `ProjectState`, computes a projected state.
3. Editor dispatches `formeditor:state-projected` carrying the projected state.
4. `flex-editable-page`, `flex-form-structure`, and `flex-staged-changes` re-render off the projected state and the buffer count.
5. Save click → `POST /edit/save` with the buffer and parentSha → server validates, applies, commits → response `{ state, sha }` → editor replaces canonical state, clears buffer, reprojects (now empty buffer = canonical state).

### Chat batch

Same as above, but step 1 is `flex-assistant` dispatching `formeditor:stage-batch` after the user clicks Accept on a proposed batch.

## Error handling

**Per-command staging errors** — staging service returns `{ ok: false, failedAt, command, error }` for the most recent append (e.g. `moveField` references a field that an earlier staged `removeGroup` deleted). Editor does not append the command, surfaces a toast explaining why, leaves the buffer untouched.

**Save-time failures** — server re-validates and re-applies the batch atomically. If `service.executeCommands` rejects, route returns `{ failedAt, command, error }`. Editor preserves the buffer, highlights the offending command in `flex-staged-changes`, shows the error in a banner. Maya removes the bad command and re-Saves.

**Concurrent edits** — Save sends `parentSha`. Server returns `409 stale` with the current sha if it doesn't match. Editor banner: "This project changed in another tab. Reload to see the latest version." Reload reads fresh state and re-applies the staged batch in-memory; commands that no longer apply are dropped with a per-command toast.

**Validation visualization** — invalid in-memory state (e.g., empty page label after rename) shown as a red border on the offending chip plus inline error message. Save button shows the count and disables when any staged command is invalid.

**Buffer loss on navigation** — `beforeunload` warns when the buffer is non-empty. Server-side draft persistence is a future story.

## Testing

### Unit (services)

- `executeBatch` is already covered by `test/forms/shaping/executor-batch.test.ts`; no new test file needed for staging.
- `test/entrypoints/app/routes/owner/edit/save.test.ts` — `POST /edit/save` happy path commits and returns sha; stale parent returns 409; mid-batch failure preserves git state; commit message contains `summary` plus per-command humanize lines.

### Component (DOM)

- `flex-editable-field` — chip clicks dispatch the right command shape; "…more" expands; debounced label edit fires one command not many; required toggle round-trips; type change dispatches `changeFieldType` with current choices.
- `flex-editable-page` — page tabs switch the rendered page without clearing the buffer; +group button appends `addGroup`; rename inline appends `renamePage`; delivery mode select appends `setDeliveryMode`.
- `flex-editable-group` — rename appends `renameGroup`; +field opens a small dialog and appends `addField`; delete with non-empty group prompts move-fields-to.
- `flex-staged-changes` — popover lists humanized commands; remove-from-batch updates the editor's buffer.
- `flex-form-editor` — receives `formeditor:stage-command`, projects state, fires `formeditor:state-projected`; Save calls `/edit/save` with the buffer and clears on success; Discard clears without a server call; `beforeunload` registered when buffer non-empty.

### Integration

- `test/forms/edit-flow.test.ts` — load editor → inline rename + chat-shaped batch → Save → assert one commit with combined humanized message.

### Architecture

- `test/architecture/dependency-rule.test.ts` — already enforces; new files must not violate.

### Visual conformance

Not applicable — the new editable components are interactive scaffolding around the existing `flex-form-field` rendering. The underlying input rendering is unchanged and remains conformant.

## Phasing

If implementation overruns, the following slice ships first as a usable v1:

1. `/edit/save` endpoint (reusing `executeBatch`) + `flex-form-editor` buffer/Save/Discard.
2. Page-level direct UI (rename, +page, delete, set delivery mode, swap pages — extends `flex-form-structure`).
3. Field-level direct UI in editable preview (label, required, type, delete, "…more" with sensitivity / control / move).
4. Group-level direct UI (rename, +field, delete, split, merge).
5. Chat assistant unified into the buffer.

Each step is independently committable and leaves the system in a working state.

## Open questions

- **Buffer persistence across reloads** — defer to a future story; `beforeunload` warning is the v1 safety net.
- **Conditional logic UI** — `setFieldCondition` requires a small builder (field, operator, value). v1 ships a basic three-input form in the "…more" panel; richer builder is a follow-up.
- **Add-page placement** — v1 always appends; reorder via tab arrows. "Insert before/after" is a follow-up if Maya asks.
