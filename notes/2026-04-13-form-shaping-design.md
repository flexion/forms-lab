# Story 4: Form Shaping Design

## Context

Story 4 delivers Maya's form shaping workflow. A project with an extracted
DataCollectionSpec and initial FormSpec already exists (Story 3). Maya now
reshapes that FormSpec — reordering pages, moving requirement groups, selecting
delivery modes, and using LLM-assisted authoring to make structural changes
efficiently.

## Decisions

- **LLM-assisted authoring is the primary workflow.** Maya describes changes in
  natural language; the LLM proposes concrete FormSpec edits. Manual controls
  (reorder, move, delivery mode select) exist for fine-tuning.
- **FormSpec is persisted in git.** Each accepted edit is a commit with the
  intent as the commit message. History, diff, and undo come from git objects
  directly — no custom undo stack.
- **No proposal/draft layer.** Story 4 edits the FormSpec in place. Story 5
  adds proposal semantics.
- **Thin client coordinator (Approach B).** Server owns all state and rendering.
  Small custom elements handle UI choreography (drag-drop, preview refresh) with
  progressive enhancement fallbacks for no-JS.
- **Strategy registry for LLM calls.** Form shaping LLM usage goes through a
  registry parallel to the extractor registry, enabling experimentation and
  evaluation.

## Editor Layout

Two-panel layout at `/projects/:id/edit`:

**Left panel — Editor:**

1. **Intent input** — text field where Maya describes changes. Submitting sends
   intent + current FormSpec + DataCollectionSpec to the LLM via the strategy
   registry. Response area below shows proposed changes with Accept/Reject
   controls.

2. **Edit history** — git log of changes made during the session. Each entry
   shows the intent message and offers Undo. Modeled after a commit history.

3. **Page list** — each page rendered as a card showing title, group count, and
   delivery mode badge. Pages are reorderable via drag-and-drop (with up/down
   arrow fallback). Clicking a page expands it to show its groups, which can
   also be reordered or moved between pages. Delivery mode is a `<select>` on
   each page card.

**Right panel — Preview:**

Renders the currently selected page as Carlos would see it, using the existing
form rendering components (`resolveFormSpec`, `flex-form-page`, `flex-form-field`,
etc.) via a server endpoint. Updates after each accepted change or manual edit.

## Navigating Large Edits

When the LLM proposes a large restructure:

- **Summary first, details on demand.** The diff response leads with a
  plain-language summary. Below that, expandable per-page details showing what
  changed.
- **Refine rather than reject.** Maya can type a follow-up in the intent input
  ("good but keep the employment section as its own page") and the LLM adjusts
  from the previous proposal.
- **History makes it safe.** Git-backed undo means large changes are never
  scary — Maya can always revert.

## LLM Integration

### Intent-Driven Editing

Maya's intent, the current FormSpec, and the DataCollectionSpec are sent to the
LLM. The LLM returns a revised FormSpec. The server diffs current vs. proposed
and presents the diff. On accept, the revised FormSpec is committed to git.

The prompt constrains the LLM to the FormSpec schema. Structured output via Zod
schema enforcement ensures valid JSON, following the same pattern as the PDF
extraction pipeline.

Model: Sonnet for interactive speed. Swappable via strategy registry.

### Delivery Mode Suggestions

When the editor loads, the LLM analyzes each section's complexity (field count,
conditional branches, sensitivity levels) and suggests a delivery mode with a
rationale (e.g., "12 conditional branches — conversational recommended"). Results
are cached for the session rather than fetched on-demand per interaction.

### Strategy Registry

A `FormShapingStrategy` registry parallel to the extractor registry. Each
strategy defines a model + prompt approach. The evaluation framework can test
strategies against fixture scenarios (given FormSpec + intent, does output match
expected structure?).

Lives in `src/services/forms/shaping/`.

### Error Handling

If the LLM returns invalid JSON or a FormSpec referencing nonexistent groups, the
server rejects the response and shows Maya a message ("I couldn't make that
change — try rephrasing?"). No partial application of invalid output.

## Custom Elements

Five focused elements, each small and independent. They communicate via DOM
events (`spec-changed`, `page-selected`). No shared client-side state — the
server-rendered HTML is the state.

| Element | Role | No-JS fallback |
|---|---|---|
| `<flex-sortable-list>` | Drag-and-drop reordering for pages and groups | Up/down arrow buttons (form POSTs) |
| `<flex-delivery-mode>` | Select that submits on change | Standard `<select>` in a `<form>` |
| `<flex-preview-panel>` | Loads preview for selected page, refreshes on changes | Static link to preview route |
| `<flex-intent-input>` | Text input for LLM intent, displays diff and accept/reject | Standard form POST, full page render of diff |
| `<flex-edit-history>` | Shows git log of edits with undo | Links to undo route |

Modern HTML platform features preferred: custom elements, `popover` where
appropriate, standard `<form>` submission as the progressive enhancement base.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/projects/:id/edit` | Render the editor page |
| POST | `/projects/:id/edit/intent` | Send intent to LLM, return proposed diff |
| POST | `/projects/:id/edit/accept` | Accept proposed changes, commit to git |
| POST | `/projects/:id/edit/reject` | Discard proposal |
| POST | `/projects/:id/edit/reorder` | Manual page/group reorder |
| POST | `/projects/:id/edit/move-group` | Move group between pages |
| POST | `/projects/:id/edit/delivery-mode` | Set delivery mode on a page |
| POST | `/projects/:id/edit/undo` | Revert to previous commit |
| GET | `/projects/:id/edit/history` | Git log of edits |
| GET | `/projects/:id/preview` | Render page as Carlos would see it |

Each mutation route: validate input, mutate FormSpec, commit to git, redirect
back to editor (or return HTML fragment for JS-enhanced requests).

The preview route reuses existing form rendering components from
`src/services/forms/` and `src/design-system/components/flex-form-*` — same
resolver, same components, just without session/submission machinery.

## Git Persistence

FormSpec is written to `projects/<id>/form-spec.json` within the forms-lab
repository and committed after each accepted change. The commit message is Maya's
intent (for LLM edits) or a description of the manual action (for fine-tuning).
Commits happen on the current branch (story-4/form-shaping or the deployed
branch) — no separate per-project repo.

- **History:** `git log -- projects/<id>/form-spec.json`
- **Undo:** Revert to a previous commit's version of the file.
- **Diff:** `git diff` between any two versions.

DataCollectionSpec stays in SQLite (extracted once, rarely changes).

## Testing

**Unit tests** — form shaping service:
- Strategy registry returns valid FormSpec given intent + current spec + data spec
- FormSpec diffing identifies added/removed/moved pages and groups
- Git persistence: write, commit, read history, undo

**Integration tests** — routes:
- Editor page renders current FormSpec structure
- Manual controls mutate and persist correctly
- Intent endpoint returns a diff; accept commits, reject discards
- Undo reverts to previous state
- Preview renders the correct page

**Behavioral tests** — custom elements:
- Sortable list reorders items, fires events, falls back to buttons
- Intent input submits, displays diff, accept/reject work
- Playwright for interaction tests where needed

LLM calls in tests use a deterministic test strategy returning canned responses,
same pattern as the extractor tests.
