# Command-Based Form Shaping Design

## Context

Story 4's initial implementation treats LLM-assisted editing as a full FormSpec
rewrite: Maya describes an intent, the LLM returns a revised FormSpec, the
server diffs before vs. after to show Maya what changed. In practice this
approach has three problems:

1. **The LLM drifts.** Asked to "swap pages 2 and 3", it kept the page IDs in
   position and swapped their content, producing noisy diffs and unpredictable
   behavior.
2. **Intent is lost.** The diff must infer what Maya asked for from structural
   differences. Nothing captures "the user wanted to swap two pages"; the
   differ just sees "two pages were modified".
3. **It doesn't scale to WYSIWYG.** A future drag-and-drop editor needs
   precise, deterministic operations — not full-document rewrites.

This design replaces the full-rewrite model with a command-based system. The
LLM emits a sequence of domain-level commands. A deterministic executor
applies them. The commands themselves are the diff. Manual UI operations
(drag-drop, delivery mode selects) emit the same commands, so the LLM flow
and the WYSIWYG-style flow share one foundation.

## Decisions

- **Command-based mutation.** The canonical representation of an edit is a
  sequence of domain commands, not a full revised spec.
- **LLM uses tool calls.** Each command kind is exposed to the LLM as a tool
  via the AI SDK's tool-use mode, so command sequences are produced through
  constrained generation rather than free-form JSON.
- **All-or-nothing batch acceptance with refine.** Maya accepts or rejects the
  whole command batch. If the batch is almost right, she types a refinement
  ("but keep the employment page separate") and the LLM produces a new batch.
  Per-command acceptance is deliberately deferred but not precluded — the
  command system is designed to enable it later.
- **Client-side option A — Hono JSX + custom elements.** No new client
  framework. Instead, a root coordinator custom element owns all ephemeral
  UI state and mediates events between children through a typed event
  protocol.
- **Commands span FormSpec and DataCollectionSpec.** Field-level commands
  modify DataCollectionSpec; structural commands modify FormSpec. This is a
  deliberate expansion of what Maya can edit, acknowledged as a shift of
  the domain boundary from Story 3.
- **Rebuild in place.** Story 4 has not shipped to main. We delete the
  existing shaper and differ and replace them with commands on the same
  branch.

## Command Vocabulary

The commands are a discriminated union, organized by the domain layer they
operate on.

### Page operations

- `reorderPages(order: pageId[])`
- `swapPages(a: pageId, b: pageId)`
- `movePage(id: pageId, toIndex: number)`
- `addPage({ afterPageId?, title, deliveryMode? })`
- `removePage(id, moveGroupsTo?)` — groups must go somewhere
- `renamePage(id, title)`
- `splitPage(id, newTitle, groupsToMove)`
- `mergePages(intoId, fromId)`
- `setDeliveryMode(pageId, mode)`

### Group operations

- `moveGroup(groupId, toPageId, atIndex?)`
- `renameGroup(id, title)`
- `addGroup({ pageId, title })`
- `removeGroup(id, moveFieldsTo?)` — fields must go somewhere
- `splitGroup(id, newTitle, fieldsToMove)`
- `mergeGroups(intoId, fromId)`

### Field operations

- `moveField(fieldId, toGroupId, atIndex?)`
- `reorderFields(groupId, order)`
- `relabelField(id, label, helpText?)`
- `setRequired(id, required)`
- `setFieldCondition(id, condition | null)`
- `setFieldSensitivity(id, level)`
- `changeFieldType(id, type, choices?)`
- `setFieldControl(id, control)` — `radio`/`select`/`checkbox`/`toggle`
- `addField({ groupId, label, type, required })`
- `removeField(id)`

### Explicit exclusions

The following are presentation concerns that the design system components
handle on their own and are not exposed as commands:

- `displayWidth` — already a hint; the renderer decides layout
- Spacing, color, typography — design system controls these
- CSS classes, variants, data-attributes — component internals

## Executor

The executor is a pure function that validates and applies a command. It
operates on a `ProjectState` that bundles both specs, because some commands
modify the FormSpec (page/group structure, delivery modes), some modify the
DataCollectionSpec (field labels, types, required flags), and some modify
both (adding a field creates it in DataCollectionSpec and places it in a
FormSpec page).

```typescript
interface ProjectState {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
}

type ExecutorResult =
  | { ok: true; state: ProjectState }
  | { ok: false; error: string; command: Command }

function executeCommand(
  state: ProjectState,
  command: Command,
): ExecutorResult

type BatchResult =
  | { ok: true; state: ProjectState }
  | { ok: false; error: string; failedAt: number; command: Command }

function executeBatch(
  state: ProjectState,
  commands: Command[],
): BatchResult
```

The batch executor applies commands sequentially. If any command fails, the
batch is rejected atomically — the previously-applied commands are discarded.
This matches the all-or-nothing acceptance semantics: Maya sees the result of
the entire proposal or none of it.

Commands are data, not methods. They are serializable (sent from LLM, posted
from client, stored in git, rendered in UI, executed on server). A
discriminated union of plain objects is the natural representation.

A client-safe *projector* — structurally identical to the executor, but
without any server-only dependencies — runs in the browser so the coordinator
can apply commands optimistically before the server round-trip completes.

## LLM Integration via Tool Use

The shaper exposes each command kind as a tool to the LLM via the AI SDK's
tool-use mode. Each tool's schema is the command's discriminator, and its
description explains the domain operation in natural language.

```typescript
interface FormShaper {
  shape(request: ShapingRequest): Promise<ShapingResult>
}

interface ShapingRequest {
  intent: string
  state: ProjectState
  previousAttempt?: { commands: Command[]; feedback: string }
}

interface ShapingResult {
  commands: Command[]
  explanation: string
}
```

The prompt provides:

- The current FormSpec and DataCollectionSpec as context
- The user's intent
- Instructions to call the appropriate tools in sequence
- A request for a one-sentence natural-language summary after the tool calls

Using tool use (rather than asking for a JSON array in the response body)
gives two advantages:

1. **Structural validity for free.** The LLM is constrained by tool
   signatures. Each call is validated by the AI SDK before we see it.
2. **Better behavior under ambiguity.** Tool use trains models to produce
   discrete, well-formed operations rather than blobs of JSON.

### Refine flow

When Maya rejects a proposal with a clarification ("almost, but keep the
employment page separate"), the request includes:

- The original intent
- The previous command batch
- Her feedback

The LLM sees its own output and iterates on it, producing a revised batch.
This is simpler than multi-turn negotiation while still supporting natural
refinement.

### Fallback

If Bedrock's tool-use mode misbehaves (the extractor had issues with
`generateObject` on Bedrock), we fall back to asking the LLM to emit a
JSON array validated by a Zod schema. The shaper strategy registry lets
us register both and swap at runtime.

## Client Architecture: Event-Coordinated Custom Elements

A single root coordinator element owns client-side ephemeral UI state.
Children are presentation-focused and communicate with the coordinator
through a typed event protocol.

### Hierarchy

```
<flex-form-editor>                      root coordinator
  <flex-command-proposal>               pending command list + accept/reject/refine
  <flex-form-structure>                 current/projected FormSpec view
    <flex-page-card data-page-id>       per-page selectable card
      <flex-group-card data-group-id>   per-group selectable card
  <flex-editor-preview>                 iframe preview
</flex-form-editor>
```

### Event protocol

Events use a `formeditor:` namespace and bubble via `bubbles: true,
composed: true`.

| Event | Direction | Payload | Handler |
|---|---|---|---|
| `formeditor:select` | child → root | `{ kind: 'page' \| 'group' \| 'field'; id }` | Coordinator updates selection |
| `formeditor:proposal-received` | root → children | `{ commands; explanation }` | Proposal + structure update |
| `formeditor:proposal-accept` | proposal → root | `{}` | Coordinator submits POST |
| `formeditor:proposal-reject` | proposal → root | `{}` | Coordinator clears proposal |
| `formeditor:proposal-refine` | proposal → root | `{ feedback }` | Coordinator submits refine POST |
| `formeditor:spec-updated` | root → children | `{ state }` | Structure + preview re-render |
| `formeditor:command-failed` | root → children | `{ error; command }` | Proposal highlights failing command |
| `formeditor:manual-command` | child → root | `{ command }` | Coordinator submits single-command POST |

### Responsibilities

**Root coordinator (`flex-form-editor`)** holds:

- Current selection (page id, group id, or field id + kind)
- Pending command proposal (commands + explanation) if any
- Refine history for the current refine session
- Current `ProjectState` (hydrated from server-rendered HTML initially)

It is the only element with state. Children are stateless presenters that
react to state changes via method calls from the coordinator.

**Children** expose public methods the coordinator calls:

- `proposal.render(commands, explanation)`
- `structure.render(state)`
- `preview.refresh(selectedPageIndex)`

Children dispatch events on user interaction (click, drag, submit) and the
coordinator handles them.

### Optimistic updates

When a proposal is accepted:

1. Coordinator calls the client-side projector with the command batch and
   current state, producing a projected state
2. Dispatches `spec-updated` with the projection
3. POSTs the commands to the server
4. On success: replaces projection with canonical server response
5. On failure: reverts to previous state, dispatches `command-failed`

Manual commands (drag-drop reorder, delivery select change) follow the same
pattern — projected locally, POSTed, reconciled with server response.

### Why a single coordinator instead of many small peers

Event coordination between N peer custom elements creates an O(N²) problem:
each element needs to know what events other elements dispatch. The
coordinator collapses this to O(N) — each child knows how to talk to the
coordinator, and the coordinator knows how to talk to each child. New child
elements need only implement the protocol; existing ones don't change.

This is the "smart container + dumb presenters" pattern at the custom-element
layer. It preserves testability (each element is independently tested),
keeps responsibilities narrow, and centralizes state in one place.

## Routes

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/:owner/:slug/edit` | Render editor shell | HTML |
| POST | `/:owner/:slug/edit/intent` | LLM shapes intent | JSON `{ commands, explanation }` |
| POST | `/:owner/:slug/edit/refine` | LLM refines with feedback | JSON `{ commands, explanation }` |
| POST | `/:owner/:slug/edit/accept` | Execute a command batch | JSON `{ state }` |
| POST | `/:owner/:slug/edit/execute` | Execute a single command | JSON `{ state }` |
| POST | `/:owner/:slug/edit/undo` | Revert to previous commit | JSON `{ state }` |
| GET | `/:owner/:slug/edit/history` | Git log of commits | JSON `{ commits }` |
| GET | `/:owner/:slug/preview` | Render page as Carlos would see | HTML |

### Key shift from current implementation

- **POST /intent** returns JSON, not a full HTML page. The client handles UI
  updates. Server is no longer re-rendering the editor on every intent
  submission.
- **POST /accept** takes a command batch, executes it, commits, returns
  updated state as JSON.
- **POST /execute** is new — handles manual operations by accepting a single
  command (e.g., drag-drop reorder dispatches `reorderPages`).

### Progressive enhancement fallback

If JS is disabled:

- The intent form submits via standard POST, server returns a full HTML page
  showing the proposed commands with Accept/Reject forms
- Manual controls (reorder buttons, delivery selects) continue to use form
  POSTs as in the current implementation
- The experience is lower-fidelity but functional

## UI Paradigm

The editor has three zones.

### Left panel: intent + proposal

- Textarea for intent
- When a proposal is active:
  - Natural-language explanation
  - Command list, each rendered via a `humanize(command, state)` function
  - Refine textarea
  - Accept / Reject / Refine buttons

### Center panel: form structure

- Vertical layout of page cards → group cards
- Click to select (highlights; preview scrolls to match)
- Drag handles for sortable reordering
- Delivery mode select on each page
- Contextual controls when selected (delete, split, etc.)

### Right panel: preview

- Iframe showing the selected page as Carlos would see it
- Refreshes on selection change or state update

### Command humanization

`humanize(command, state)` is deterministic rendering logic — not
LLM-generated text. It produces short human-readable descriptions:

- `swapPages(a, b)` → "Swap pages 'A title' and 'B title'"
- `moveField(field, toGroup)` → "Move field 'field label' to group 'group title'"
- `setDeliveryMode(page, mode)` → "Set 'page title' delivery mode to conversational"

This is presentation logic, lives alongside the executor, is independently
testable, and is used both client-side and server-side.

### Interactivity

- Hover a command → affected element highlights in the structure view
- Click a command → selects its affected element
- Future: click to toggle individual commands (per-command acceptance)

## Git Persistence and Audit Trail

One accepted batch = one git commit. Manual single commands also produce
commits (each is a trivial one-command batch).

### Commit message format

```
Apply shaping: <explanation>

Commands: reorderPages, setDeliveryMode
```

The explanation is the LLM's natural-language summary for LLM-driven batches,
or an auto-generated humanized description for manual commands.

### Structured audit log

Alongside `forms/default/form.json`, a new file
`forms/default/shaping-log.json` stores structured entries:

```json
[
  {
    "timestamp": "2026-04-15T14:30:00Z",
    "authorCommit": "abc123",
    "source": "llm" | "manual",
    "intent": "swap pages 2 and 3",
    "commands": [{ "kind": "swapPages", "a": "page-2", "b": "page-3" }],
    "explanation": "Swap pages 'Employment' and 'Eligibility'"
  }
]
```

Storing this as data (rather than relying on commit messages alone) makes the
audit trail queryable: "show me every command that changed delivery mode" is
a trivial filter.

## Testing Strategy

### Unit tests — executor

- Each command kind: valid input produces correct new state; invalid input
  returns typed error
- Batch executor: sequential application, atomic rollback on mid-batch failure
- Projector (client-safe): matches executor for same inputs across all
  command kinds

### Unit tests — humanize

- Every command kind produces a non-empty, human-readable string
- Title interpolation pulls from current state

### Unit tests — shaper

- Tool-use round-trip with canned responses (deterministic test strategy)
- Refine flow: previous commands + feedback produces new commands
- Validation: all LLM-returned commands pass executor validation

### Integration tests — routes

- POST /intent returns valid JSON
- POST /accept executes, commits to git, returns updated state
- POST /execute handles single-command operations
- POST /refine includes previous attempt context

### Behavioral tests — custom elements (Playwright)

- Click-to-select propagates via event protocol to coordinator
- Accept triggers POST and updates structure view
- Drag-drop dispatches `reorderPages` via manual-command event
- Error response surfaces in proposal view

## Migration from Current Story 4 Code

### Deleted

- `src/services/forms/shaping/bedrock-shaper.ts` — replaced by tool-use version
- `src/services/forms/shaping/differ.ts` — commands are the diff
- `src/services/forms/shaping/prompts/shape-intent.ts` — replaced by tool
  descriptions
- `src/entrypoints/app/routes/owner/edit/index.tsx` adapters
  (`toServicesFormSpec`, `toModelsFormSpec`) if no longer needed after
  consolidating types
- The existing `flex-intent-input` custom element — replaced by
  coordinator-mediated proposal

### Kept

- ProjectService git persistence methods (`updateFormSpec`,
  `getFormSpecHistory`, `undoFormSpec`) — may gain a command-log parameter
- Route skeletons (GET /edit, GET /preview, POST /undo)
- Strategy registry pattern (`FormShaper` interface changes, registry stays)
- `flex-preview-panel` custom element (still an iframe that reloads)
- `flex-sortable-list` custom element — adapted to dispatch manual commands

### Refactored

- `EditorPage` JSX becomes a thin server-rendered shell that hydrates the
  coordinator
- Edit route tests adapt to JSON-returning endpoints
- Existing differ tests deleted (6 tests) and replaced with executor tests

Rough scope: 40-50% rewrite of editor-specific code. Service-layer plumbing
(storage, git, routes skeletons, registry pattern) stays intact.

## Domain Boundary Note

Introducing `addField`, `removeField`, `relabelField`, and
`changeFieldType` commands means Maya can now freely edit the
DataCollectionSpec — not just the FormSpec. Story 3 established
DataCollectionSpec as "what to collect" (extracted from PDF, rarely
changed) and FormSpec as "how to present". This design expands that
boundary.

Consequences to watch:

1. Extraction confidence data no longer corresponds 1:1 to the current
   DataCollectionSpec after edits.
2. The audit trail must clearly mark which edits came from the LLM vs.
   from manual actions, for operator review.
3. If any Story 3 code assumes DataCollectionSpec is immutable after
   extraction, it needs review.

These are not blockers, but worth flagging so future work doesn't assume
DataCollectionSpec is still write-once.

## Open Items for Implementation

These are decided conceptually but deferred to implementation:

- Exact Zod schemas for each command (mirrors the TypeScript union)
- Condition-building UX: `setFieldCondition` takes a structured condition;
  how does Maya express "only show if X = Y" in the LLM prompt?
- Whether `projector.ts` is a full port of executor logic or a simpler
  optimistic approximator
- Whether the command log lives in git alongside `form.json` or in a
  separate audit store (leaning toward git for consistency)
