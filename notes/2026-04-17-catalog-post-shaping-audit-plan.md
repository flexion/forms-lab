# Catalog Post-Shaping Audit & Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Forms Lab catalog so it truthfully reflects the command-based form-shaping work that merged in PR #42, and close evaluator-facing gaps before the final presentation.

**Architecture:** Pure documentation work. No source code changes. Markdown edits in `catalog/` (decisions, architecture, walkthrough, stories, experiments, personas), one notes file (`flight-board.md`), and test updates in `test/catalog-walkthrough.test.ts` to cover the renumbered walkthrough.

**Tech Stack:** Markdown with YAML frontmatter. Bun for tests. No new dependencies.

---

## File Structure

### Files to create

- `catalog/decisions/architecture/command-based-shaping.md` (ADR)
- `catalog/decisions/architecture/llm-tool-use-as-validation-boundary.md` (ADR)
- `catalog/decisions/architecture/coordinator-custom-elements.md` (ADR)
- `catalog/experiments/shaping-architecture/_suite.md` (experiment suite)
- `catalog/experiments/shaping-architecture/full-rewrite.md` (experiment variant)
- `catalog/experiments/shaping-architecture/command-based.md` (experiment variant)
- `catalog/walkthrough/04-llm-assisted-form-shaping.md` (new walkthrough page — inserted at position 4)

### Files to modify

- `catalog/walkthrough/04-evaluation-and-experimentation.md` → rename to `05-evaluation-and-experimentation.md`, bump `order: 4` → `order: 5`
- `catalog/walkthrough/05-production-infrastructure.md` → rename to `06-production-infrastructure.md`, bump `order: 5` → `order: 6`
- `catalog/walkthrough/06-inference-pipeline.md` → rename to `07-inference-pipeline.md`, bump `order: 6` → `order: 7`; add shaping pipeline section
- `catalog/walkthrough/07-live-demo.md` → rename to `08-live-demo.md`, bump `order: 7` → `order: 8`; add "Shape a Form" section
- `catalog/walkthrough/08-whats-next.md` → rename to `09-whats-next.md`, bump `order: 8` → `order: 9`; remove shaping from planned
- `catalog/walkthrough/02-our-approach.md` → add one line about two LLM integration points
- `catalog/stories/4-maya-shapes-the-form-experience.md` → mark ACs and add Implementation Notes
- `catalog/architecture/software-architecture.md` → add shaping service + AI SDK tool-use
- `catalog/architecture/threat-model.md` → add two threats + changelog entry
- `catalog/architecture/system-overview.md` → expand Data Flow step 2
- `catalog/architecture/data-model.md` → fix stale path; add Shaping Commands section
- `notes/flight-board.md` → move story 4 to Landed section
- `test/catalog-walkthrough.test.ts` → update slug list and page count

### Files deliberately NOT modified

- `catalog/personas/maya.md` — re-read confirms no change needed
- Story files 5–9 — describe future work, still accurate
- Any source code under `src/` — documentation-only change set

---

## Task 1: Read canonical sources and verify paths exist

No code edits in this task — the goal is to have the source material in context for the ADRs and walkthrough page.

**Files:**
- Read: `notes/2026-04-15-command-based-shaping-design.md`
- Read: `notes/2026-04-16-layout-overhaul-design.md`
- Read: `notes/story-4-form-shaping/review.md`
- Verify exists: `src/services/forms/shaping/commands.ts`
- Verify exists: `src/services/forms/shaping/executor.ts`
- Verify exists: `src/services/forms/shaping/tools.ts`
- Verify exists: `src/services/forms/shaping/bedrock-shaper.ts`
- Verify exists: `src/design-system/components/flex-form-editor/client.ts`

- [ ] **Step 1: Verify all referenced source files exist**

```bash
ls -1 \
  src/services/forms/shaping/commands.ts \
  src/services/forms/shaping/executor.ts \
  src/services/forms/shaping/humanize.ts \
  src/services/forms/shaping/projector.ts \
  src/services/forms/shaping/tools.ts \
  src/services/forms/shaping/bedrock-shaper.ts \
  src/design-system/components/flex-form-editor/client.ts \
  src/design-system/components/flex-form-editor/protocol.ts \
  src/design-system/components/flex-assistant/ \
  src/design-system/components/flex-form-structure/ \
  src/services/data-collection/types.ts \
  src/services/forms/types.ts
```

Expected: every path prints. If anything is missing, stop and flag it — the ADRs link these paths and they must be live.

- [ ] **Step 2: Read the three canonical design/review docs**

```bash
cat notes/2026-04-15-command-based-shaping-design.md
cat notes/2026-04-16-layout-overhaul-design.md
cat notes/story-4-form-shaping/review.md
```

Use the content (AC coverage table, command vocabulary, tool-use rationale, coordinator event protocol) as the source of truth for later tasks.

- [ ] **Step 3: Read the existing ADR template**

```bash
cat catalog/decisions/architecture/form-project-repos-and-permissions.md
```

This ADR demonstrates the expected shape: frontmatter with `status`, `tags`, `decided`; sections `Context`, `Decision`, and (usually) no separate "Consequences" — consequences are folded into the Decision prose. Match this style.

- [ ] **Step 4: No commit (reading only)**

---

## Task 2: Write ADR — Command-based shaping

**Files:**
- Create: `catalog/decisions/architecture/command-based-shaping.md`

- [ ] **Step 1: Write the ADR**

Create `catalog/decisions/architecture/command-based-shaping.md` with this content:

```markdown
---
status: stable
tags: [architecture, llm, forms, shaping]
decided: 2026-04-15
---

# Command-based form shaping

The canonical representation of an edit to a form's `DataCollectionSpec` or `FormSpec` is a sequence of domain commands, not a revised full spec.

## Context

Story 4's first-round implementation treated LLM-assisted editing as a full `FormSpec` rewrite: Maya described an intent, the LLM returned a revised `FormSpec`, the server diffed before vs. after to show Maya what changed. Three failure modes surfaced in practice:

1. **The LLM drifted.** Asked to "swap pages 2 and 3", Claude kept the page IDs in position and swapped their content, producing noisy structural diffs and unpredictable behavior.
2. **Intent was lost.** The diff had to infer what Maya asked for from structural differences. Nothing captured "the user wanted to swap two pages"; the differ only saw "two pages were modified".
3. **It did not scale toward WYSIWYG.** A future drag-and-drop editor needs precise, deterministic operations, not a full-document rewrite per interaction.

## Decision

**Edits are command sequences.** A command is a discriminated-union value describing one domain operation — `swapPages`, `moveGroup`, `relabelField`, etc. `src/services/forms/shaping/commands.ts` defines the vocabulary; `src/services/forms/shaping/executor.ts` applies a batch atomically (all succeed or none).

**Commands span both domain layers.** Page/group-structural commands modify `FormSpec`. Field-level commands (label, required, help text, control) modify `DataCollectionSpec`. This is a deliberate broadening of Maya's edit surface compared to Story 3, which only established `DataCollectionSpec` as an extraction output.

**Batches are atomic with rollback.** `executeBatch` validates each command against current state before applying; any failure rolls the whole batch back. Partial edits never reach git.

**Commands are the diff.** A humanizer (`humanize.ts`) renders each command as a natural-language line ("Swap pages 'Personal Info' and 'Employment'"). The list of humanized commands is what Maya reviews; no separate structural differ is maintained.

**One batch, one git commit.** On accept, the shaping service writes the commit and appends a structured entry to `forms/<slug>/shaping-log.json` capturing the intent, the command batch, and the resulting commit SHA.

## Consequences

- Adding a new edit kind is a three-edit change: extend the discriminated union in `commands.ts`, add a case to `executor.ts`, add a humanizer line.
- Manual UI operations (a future drag-drop on `flex-form-structure`, a delivery-mode select, a page-rename input) emit the same commands as LLM-proposed edits. One foundation for both.
- Per-command acceptance is deliberately deferred. The current UI accepts or rejects the whole batch. Nothing in the design precludes per-command acceptance later; commands are already individually addressable.
- The shaping log is append-only and replayable. Any batch can be reconstructed from git plus the log entry.

## Sources

- Design note: [`notes/2026-04-15-command-based-shaping-design.md`](../../../notes/2026-04-15-command-based-shaping-design.md) (in-repo)
- Code: `src/services/forms/shaping/commands.ts`, `executor.ts`, `humanize.ts`
- Review: [`notes/story-4-form-shaping/review.md`](../../../notes/story-4-form-shaping/review.md)
- Related: [LLM tool-use as validation boundary](llm-tool-use-as-validation-boundary.md), [Coordinator custom elements](coordinator-custom-elements.md)
```

- [ ] **Step 2: Verify the file renders via the decisions route**

Start the dev server and visit the decision page:

```bash
bun run dev &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/catalog/decisions/architecture/command-based-shaping
kill %1 2>/dev/null
```

Expected: `200`. If 404, re-check the filename.

- [ ] **Step 3: Commit**

```bash
git add catalog/decisions/architecture/command-based-shaping.md
git commit -m "docs(catalog): add ADR for command-based form shaping"
```

---

## Task 3: Write ADR — LLM tool-use as validation boundary

**Files:**
- Create: `catalog/decisions/architecture/llm-tool-use-as-validation-boundary.md`

- [ ] **Step 1: Write the ADR**

Create `catalog/decisions/architecture/llm-tool-use-as-validation-boundary.md`:

```markdown
---
status: stable
tags: [architecture, llm, security, shaping]
decided: 2026-04-15
---

# LLM tool-use as the validation boundary

The shaping service uses AI SDK tool-use mode to constrain Claude's output to a fixed set of typed tools. Each tool is backed by a Zod schema. The server re-validates every command with the same schema before the executor runs.

## Context

Story 4's first-round implementation asked Claude to return a revised `FormSpec` as free-form JSON. That approach mixed three responsibilities into one parse step: structural well-formedness, schema conformance, and semantic validity. Malformed output was ambiguous — was this an attack, a generation failure, or an off-by-one in the prompt? — and ad-hoc JSON recovery logic grew quickly.

The command-based design (see [Command-based form shaping](command-based-shaping.md)) gave us a clean discriminated union of edit operations. The question became: how should the LLM express a command sequence?

## Decision

**Each command kind is exposed to the LLM as a tool.** `src/services/forms/shaping/tools.ts` registers one AI SDK tool per command variant, with its `input` parameter schema matching the Zod schema for that command.

**The Zod schema is the single source of truth.** The same schemas defined alongside the command vocabulary in `src/services/forms/shaping/commands.ts` are what the AI SDK uses to describe tools to Claude and what the server uses to validate each command before execution. There is no separate "LLM request schema".

**The server re-validates, even though Claude is constrained.** After Bedrock returns a tool-call sequence, the shaper parses each call with `commandSchema.parse()` before handing the batch to the executor. This guards against:

- SDK version skew (Claude's tool-call shape changing underneath us)
- Partial tool calls (truncated output, timeouts)
- Any future path that might ingest commands from another source

**The executor performs semantic validation.** A well-formed command ("`removeGroup(id: x)`") may still fail because `x` doesn't exist, or because removing it would leave orphaned fields with no destination. The executor runs state-dependent checks and can reject a command, which triggers batch rollback.

## Consequences

Three layers of defense protect `FormSpec`/`DataCollectionSpec` integrity from LLM output:

1. **Tool grammar** (provider-enforced). Claude cannot emit a call whose arguments don't match the declared schema.
2. **Zod re-validation** (server-enforced). The server doesn't trust the SDK to have done step 1 correctly.
3. **Executor semantic validation** (state-aware). Structural validity is not semantic validity. The executor enforces the latter.

Adding a new command is a two-file change: extend the union in `commands.ts` (which adds a Zod schema) and register a matching tool in `tools.ts`. Both the LLM grammar and server validation update together.

The [threat model](../../architecture/threat-model.md) entry for form shaping cites Zod schema enforcement as the primary integrity boundary between Claude's output and the filesystem.

## Sources

- Design note: [`notes/2026-04-15-command-based-shaping-design.md`](../../../notes/2026-04-15-command-based-shaping-design.md) (in-repo)
- Code: `src/services/forms/shaping/tools.ts`, `commands.ts`, `bedrock-shaper.ts`
- Related: [Command-based form shaping](command-based-shaping.md)
```

- [ ] **Step 2: Verify the page renders**

```bash
bun run dev &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/catalog/decisions/architecture/llm-tool-use-as-validation-boundary
kill %1 2>/dev/null
```

Expected: `200`.

- [ ] **Step 3: Commit**

```bash
git add catalog/decisions/architecture/llm-tool-use-as-validation-boundary.md
git commit -m "docs(catalog): add ADR for LLM tool-use as validation boundary"
```

---

## Task 4: Write ADR — Coordinator custom elements

**Files:**
- Create: `catalog/decisions/architecture/coordinator-custom-elements.md`

- [ ] **Step 1: Write the ADR**

Create `catalog/decisions/architecture/coordinator-custom-elements.md`:

```markdown
---
status: stable
tags: [architecture, design-system, client-side, shaping]
decided: 2026-04-16
---

# Coordinator custom elements for interactive UI

The form editor's client-side behavior is composed of native custom elements. A root `flex-form-editor` coordinator owns ephemeral state and mediates between children via typed `CustomEvent`s. No client framework (React/Vue/Svelte/etc.) is introduced.

## Context

The form editor is the most interactive surface in Forms Lab: three panels (structure, preview, assistant), two-way synchronization between them (click a page in structure → scroll preview, type an intent → stream proposed commands), and a chat transcript that accumulates across accept/reject/refine cycles. All prior interactive UI in the project (catalog browsing, form filling) was either stateless or driven by page navigation, so the question had never been forced.

A conventional approach would adopt React or Vue for the editor. That would conflict with three project properties:

- **P2 dependency rule.** `design-system/` depends only on `shared/`. Introducing a framework means either threading its runtime through `design-system/` or carving out an exception for this one surface.
- **P4 presentation is stateless.** Design-system components receive props; they don't own state. The editor genuinely *does* own state (open panels, pending commands, chat history) — but that state is ephemeral UI state, not domain state.
- **Server-rendered posture.** Pages are Hono JSX; no client runtime exists. Adding one means a bundler pipeline, hydration story, and SSR compatibility concerns for one feature.

## Decision

**Custom elements are the unit of client interactivity.** Each interactive piece is a `HTMLElement` subclass registered via `customElements.define`. `src/design-system/components/flex-form-editor/client.ts` is the coordinator; sibling directories (`flex-assistant/`, `flex-form-structure/`) define the child elements.

**One coordinator owns editor-scoped state.** Ephemeral state (current spec, pending command batch, chat transcript, panel open/closed) lives on the `flex-form-editor` root element. Children read from the coordinator via DOM traversal; they mutate by dispatching events.

**Events are typed.** `src/design-system/components/flex-form-editor/protocol.ts` defines the event names and payload shapes. Every `CustomEvent` dispatched inside the editor conforms to that protocol. The coordinator's event listeners are the single place where "what should happen when the user does X" is decided.

**Children do not talk to each other directly.** Every cross-panel interaction (structure click → preview update; assistant accept → spec mutation → structure refresh) flows through the coordinator. This keeps the communication graph a star, not a mesh.

**No framework.** No React, Vue, Svelte, Alpine, HTMX, or similar is introduced. The server renders initial markup; custom elements attach behavior; the spec is passed as a JSON bootstrap in a `<script type="application/json">` element (escaped against `</script>` break-out; see the threat model).

## Consequences

- Each child element is independently unit-testable — instantiate the element, assert its rendered DOM, dispatch events against it.
- The event protocol is a typed contract. Adding an interaction is "extend the protocol type, add the listener in the coordinator, dispatch from the child".
- The design system stays framework-free. Any future editor-style surface can reuse the same pattern without pulling in a runtime.
- Trade-offs: no component-tree time-travel debugging; client logic is spread across per-element files rather than a single component tree; there is no reconciler for keyed list updates (the editor avoids this by re-rendering containers wholesale on spec changes, which is fast enough at current list sizes).

## Sources

- Design note: [`notes/2026-04-16-layout-overhaul-design.md`](../../../notes/2026-04-16-layout-overhaul-design.md) (in-repo)
- Code: `src/design-system/components/flex-form-editor/client.ts`, `protocol.ts`; `flex-assistant/`, `flex-form-structure/`
- Related: [Command-based form shaping](command-based-shaping.md)
```

- [ ] **Step 2: Verify the page renders**

```bash
bun run dev &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/catalog/decisions/architecture/coordinator-custom-elements
kill %1 2>/dev/null
```

Expected: `200`.

- [ ] **Step 3: Commit**

```bash
git add catalog/decisions/architecture/coordinator-custom-elements.md
git commit -m "docs(catalog): add ADR for coordinator custom elements pattern"
```

---

## Task 5: Update story 4 with AC status and implementation notes

**Files:**
- Modify: `catalog/stories/4-maya-shapes-the-form-experience.md`

The current file has unchecked ACs that don't match the shipped reality. The source of truth for AC status is `notes/story-4-form-shaping/review.md`.

- [ ] **Step 1: Replace the Acceptance Criteria block and add Implementation Notes**

Open `catalog/stories/4-maya-shapes-the-form-experience.md`. Replace the existing `## Acceptance Criteria:` section and the `## Notes:` section with:

```markdown
## Acceptance Criteria:

- [x] Maya can view the current FormSpec for a project
- [x] Maya can describe changes in natural language and see the LLM propose concrete edits
- [x] Proposed edits are shown as humanized command list (the commands *are* the diff)
- [x] Maya can accept, reject, or refine a proposed batch
- [x] Maya can reorder pages (manual swap) and pick per-page delivery modes
- [x] Changes save atomically as a git commit per accepted batch, with a structured shaping log
- [x] Live preview updates to show what Carlos would see after accepted edits
- [ ] Dedicated LLM suggest-modes button (partial — the LLM can emit `setDeliveryMode` via tool use, but no one-click "suggest modes" surface)
- [ ] Direct group-move UI (partial — command exists, no drag/dropdown; Maya achieves it via natural language for now)

## Notes:

- Maya's edits are proposals until accepted. Rejecting a batch discards nothing durable; accepting writes a git commit and a `shaping-log.json` entry.
- The LLM uses constrained generation: each command kind is an AI SDK tool with a Zod schema. See [LLM tool-use as validation boundary](../decisions/architecture/llm-tool-use-as-validation-boundary.md).
- Commands span both domain layers (structural edits to `FormSpec`, field edits to `DataCollectionSpec`). This is a deliberate broadening of Story 3's extraction output. See [Command-based form shaping](../decisions/architecture/command-based-shaping.md).
- The editor UI uses a coordinator custom-element pattern rather than a client framework. See [Coordinator custom elements](../decisions/architecture/coordinator-custom-elements.md).
- Context for why the implementation pivoted mid-story: [Shaping architecture experiment](../experiments/shaping-architecture/).

## Implementation Notes:

**Shipped:**

- Command vocabulary spanning page, group, and field operations (`src/services/forms/shaping/commands.ts`)
- Atomic batch executor with rollback (`executor.ts`)
- AI SDK tool-use integration against Bedrock (`bedrock-shaper.ts`, `tools.ts`)
- Humanizer that renders commands as natural-language lines (`humanize.ts`)
- Three-panel editor layout (structure / preview / assistant) with collapsible panels
- Git-backed audit trail: one commit per accepted batch plus structured `shaping-log.json`
- Accept / reject / refine loop with persistent chat transcript

**Deferred follow-ups (not blocking landing):**

- Dedicated direct UI for group-move (currently natural-language only)
- Dedicated "suggest delivery modes" prompt button
- Playwright behavioral tests for custom elements (executor is well-tested; end-to-end custom-element tests remain)
- Integration tests for `/intent`, `/accept`, `/execute` JSON routes (especially a 403/400 regression test on `/accept`)
- Optimistic concurrency guard (`expected-base-sha` on `/accept`) — acceptable for single-user v1
- Move shared `commands.ts` + `humanize.ts` to `src/shared/shaping/` to eliminate humanizer duplication between server and `flex-command-proposal` — requires an ADR amendment to the `import type` exclusion in the dependency-rule test
```

- [ ] **Step 2: Run the catalog tests**

```bash
bun test test/catalog-stories.test.ts
```

Expected: PASS. The test file covers story list/detail rendering; new content should still render.

- [ ] **Step 3: Commit**

```bash
git add catalog/stories/4-maya-shapes-the-form-experience.md
git commit -m "docs(story-4): mark ACs and document shipped vs deferred work"
```

---

## Task 6: Update software-architecture.md with shaping service

**Files:**
- Modify: `catalog/architecture/software-architecture.md`

- [ ] **Step 1: Add the `forms/shaping/` bullet under `src/services/`**

Locate the `### src/services/` section (around line 78). Find the bullet for `forms/` (currently: `- **forms/** — Form resolution, validation, navigation, sessions, and submission. ...`).

Immediately after that bullet, insert:

```markdown
- **`forms/shaping/`** — LLM-assisted form shaping. Command vocabulary (`commands.ts`), atomic batch executor (`executor.ts`), humanizer (`humanize.ts`), client-safe projector (`projector.ts`), AI SDK tool registry (`tools.ts`), Bedrock-backed shaper (`bedrock-shaper.ts`). Each accepted batch produces one git commit plus a structured entry in `forms/<slug>/shaping-log.json`. See the [command-based shaping decision](../decisions/architecture/command-based-shaping.md).
```

- [ ] **Step 2: Extend the "Isolated" list with AI SDK tool-use**

Find the `**Current state:**` paragraph (around line 127). Locate the `- **Isolated:**` line. Change:

```markdown
- **Isolated:** USWDS (design-system only), Bedrock (`services/ingestion/` only), `bun:sqlite` (`services/storage.ts` and `services/user-store.ts` only), git CLI (`services/form-project-repo.ts` only), `markdown-it` (`services/content/markdown.ts` only)
```

to:

```markdown
- **Isolated:** USWDS (design-system only), Bedrock (`services/ingestion/` and `services/forms/shaping/` only), AI SDK tool-use (`services/forms/shaping/` only), `bun:sqlite` (`services/storage.ts` and `services/user-store.ts` only), git CLI (`services/form-project-repo.ts` only), `markdown-it` (`services/content/markdown.ts` only)
```

- [ ] **Step 3: Add the three new ADRs to `## Sources`**

Find the `## Sources` section at the bottom. Change:

```markdown
## Sources

- [Architecture Principles ADR](../decisions/architecture/architecture-principles.md) — provenance for P1–P4
- [Hono on Bun decision](../decisions/architecture/hono-on-bun.md)
- [Git as persistence decision](../decisions/architecture/git-as-persistence.md)
- [Data model](data-model.md) — domain types in detail
- [System overview](system-overview.md) — infrastructure topology
```

to:

```markdown
## Sources

- [Architecture Principles ADR](../decisions/architecture/architecture-principles.md) — provenance for P1–P4
- [Hono on Bun decision](../decisions/architecture/hono-on-bun.md)
- [Git as persistence decision](../decisions/architecture/git-as-persistence.md)
- [Command-based form shaping](../decisions/architecture/command-based-shaping.md)
- [LLM tool-use as validation boundary](../decisions/architecture/llm-tool-use-as-validation-boundary.md)
- [Coordinator custom elements](../decisions/architecture/coordinator-custom-elements.md)
- [Data model](data-model.md) — domain types in detail
- [System overview](system-overview.md) — infrastructure topology
```

- [ ] **Step 4: Render check**

```bash
bun run dev &
sleep 2
curl -s http://localhost:3000/catalog/architecture/software-architecture | grep -c "forms/shaping"
kill %1 2>/dev/null
```

Expected: `>= 1`. (Multiple is fine — links count too.)

- [ ] **Step 5: Commit**

```bash
git add catalog/architecture/software-architecture.md
git commit -m "docs(architecture): document shaping service and tool-use dependency"
```

---

## Task 7: Update threat-model.md with shaping threats and changelog

**Files:**
- Modify: `catalog/architecture/threat-model.md`

- [ ] **Step 1: Add two threats to the shaping section**

Open `catalog/architecture/threat-model.md`. Find the `### Hono application to LLM (form shaping)` section (near line 188). Locate the existing `**Threats:**` list. Append two bullets to that list:

```markdown
- **LLM cost abuse via refinement loop** — an authenticated project owner can submit refinement feedback repeatedly, driving unbounded LLM calls. Each call costs real money and takes seconds to complete.
- **Prompt injection via `previousAttempt.feedback`** — refinement feedback is concatenated into the shaping prompt. A project owner could craft feedback that attempts to manipulate later LLM behavior. Attacker must already be authenticated and own the project, so severity is low; worth recording the surface.
```

- [ ] **Step 2: Add corresponding rows to the threat summary table**

Find the threat summary table (it has rows like `| Prompt injection via form labels | ... |`). Add two new rows immediately below the existing shaping rows:

```markdown
| Refinement-loop cost abuse | Hono-LLM (form shaping) | Low | Medium | Authentication + ownership check; no rate limit yet | Partially mitigated |
| Refinement-feedback prompt injection | Hono-LLM (form shaping) | Low | Low | Output validation, Zod schema enforcement | Partially mitigated |
```

- [ ] **Step 3: Add a changelog entry**

Find the changelog table at the bottom (rows like `| 2026-04-15 | Story 4 v2 | ... |`). Append one row (keep date ordering):

```markdown
| 2026-04-17 | Story 4 review follow-up | Added refinement-loop abuse and refinement-feedback prompt-injection threats surfaced in story-4 code review |
```

- [ ] **Step 4: Run architecture tests**

```bash
bun test test/catalog-architecture.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add catalog/architecture/threat-model.md
git commit -m "docs(threat-model): add refinement-loop abuse and prompt injection threats"
```

---

## Task 8: Update system-overview.md Data Flow

**Files:**
- Modify: `catalog/architecture/system-overview.md`

- [ ] **Step 1: Expand Data Flow step 2**

In `catalog/architecture/system-overview.md`, find the Data Flow numbered list. Change step 2 from:

```markdown
2. Maya shapes FormSpec (page flow, delivery modes) via authoring UI
```

to:

```markdown
2. Maya shapes FormSpec via LLM-assisted command-based editor; each accepted batch executes atomically, produces a git commit, and is recorded in a structured shaping log
```

- [ ] **Step 2: Commit**

```bash
git add catalog/architecture/system-overview.md
git commit -m "docs(system-overview): reflect command-based shaping in data flow"
```

---

## Task 9: Update data-model.md with shaping commands and correct type paths

**Files:**
- Modify: `catalog/architecture/data-model.md`

- [ ] **Step 1: Fix the stale type-definitions path**

Find the `## Type Definitions` section:

```markdown
## Type Definitions

All types are defined in `src/types/models.ts`.
```

Replace with:

```markdown
## Type Definitions

Each service owns its domain types (architecture principle P3):

- `DataCollectionSpec`, `DataRequirement`, and field/validation types → [`src/services/data-collection/types.ts`](https://github.com/flexion/forms-lab/tree/main/src/services/data-collection/types.ts)
- `FormSpec`, `FormPage`, `ResolvedForm`, `FormSession` → [`src/services/forms/types.ts`](https://github.com/flexion/forms-lab/tree/main/src/services/forms/types.ts)
- Shaping commands (discriminated union + Zod schemas) → [`src/services/forms/shaping/commands.ts`](https://github.com/flexion/forms-lab/tree/main/src/services/forms/shaping/commands.ts)
- Ingestion and extraction types → [`src/services/ingestion/types.ts`](https://github.com/flexion/forms-lab/tree/main/src/services/ingestion/types.ts)
```

- [ ] **Step 2: Add the Shaping Commands section**

Immediately before `## Type Definitions`, insert a new section:

```markdown
## Shaping Commands

Edits to a `DataCollectionSpec` or `FormSpec` are expressed as a sequence of **commands** — a discriminated union of domain operations. Commands are the canonical representation of "what changed", produced both by LLM-assisted editing (tool-use mode) and by manual editor actions.

- **Page operations** — reorder, swap, move, add, remove, rename, split, merge, set delivery mode
- **Group operations** — move, rename, add, remove, split, merge
- **Field operations** — move, reorder, relabel, set required, set help text, set control, set condition, add, remove

A batch of commands executes atomically: validation happens per-command, and any failure rolls the whole batch back. Each accepted batch produces one git commit plus an entry in `forms/<slug>/shaping-log.json` capturing the originating intent, the command sequence, and the resulting commit SHA.

See the [command-based shaping decision](../decisions/architecture/command-based-shaping.md) for rationale.
```

- [ ] **Step 3: Update Sources**

Replace the existing `## Sources` section at the bottom:

```markdown
## Sources

- [Design spec: Data Model](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
```

with:

```markdown
## Sources

- [Design spec: Data Model](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Command-based form shaping](../decisions/architecture/command-based-shaping.md)
```

- [ ] **Step 4: Run architecture tests**

```bash
bun test test/catalog-architecture.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add catalog/architecture/data-model.md
git commit -m "docs(data-model): add shaping commands; fix stale types path"
```

---

## Task 10: Renumber existing walkthrough pages to make room for new shaping page

The walkthrough route parses `order` as an integer (`parseInt`), so fractional orders tie. The new page goes at order 4. Pages currently at orders 4–8 shift up by one.

**Files:**
- Rename/modify: `catalog/walkthrough/04-evaluation-and-experimentation.md` → `05-evaluation-and-experimentation.md`
- Rename/modify: `catalog/walkthrough/05-production-infrastructure.md` → `06-production-infrastructure.md`
- Rename/modify: `catalog/walkthrough/06-inference-pipeline.md` → `07-inference-pipeline.md`
- Rename/modify: `catalog/walkthrough/07-live-demo.md` → `08-live-demo.md`
- Rename/modify: `catalog/walkthrough/08-whats-next.md` → `09-whats-next.md`

- [ ] **Step 1: Rename the five files using `git mv` (in reverse order to avoid collisions)**

```bash
git mv catalog/walkthrough/08-whats-next.md catalog/walkthrough/09-whats-next.md
git mv catalog/walkthrough/07-live-demo.md catalog/walkthrough/08-live-demo.md
git mv catalog/walkthrough/06-inference-pipeline.md catalog/walkthrough/07-inference-pipeline.md
git mv catalog/walkthrough/05-production-infrastructure.md catalog/walkthrough/06-production-infrastructure.md
git mv catalog/walkthrough/04-evaluation-and-experimentation.md catalog/walkthrough/05-evaluation-and-experimentation.md
```

- [ ] **Step 2: Bump each file's `order` frontmatter**

Edit each renamed file and bump its `order:` value by 1:

- `catalog/walkthrough/05-evaluation-and-experimentation.md`: `order: 4` → `order: 5`
- `catalog/walkthrough/06-production-infrastructure.md`: `order: 5` → `order: 6`
- `catalog/walkthrough/07-inference-pipeline.md`: `order: 6` → `order: 7`
- `catalog/walkthrough/08-live-demo.md`: `order: 7` → `order: 8`
- `catalog/walkthrough/09-whats-next.md`: `order: 8` → `order: 9`

- [ ] **Step 3: Verify the five files were renamed and their orders bumped**

```bash
for f in 05-evaluation-and-experimentation 06-production-infrastructure 07-inference-pipeline 08-live-demo 09-whats-next; do
  head -5 "catalog/walkthrough/${f}.md"
  echo ---
done
```

Expected: each file's frontmatter `order:` matches the numeric prefix of its filename.

- [ ] **Step 4: Do NOT commit yet**

This task intentionally leaves the working tree broken — walkthrough now has a gap at position 4 and the tests reference old slugs. Task 11 fills the gap; Task 16 fixes the tests. One combined commit at the end of Task 16 keeps history coherent.

---

## Task 11: Write the new walkthrough page for LLM-assisted form shaping

**Files:**
- Create: `catalog/walkthrough/04-llm-assisted-form-shaping.md`

- [ ] **Step 1: Write the page**

Create `catalog/walkthrough/04-llm-assisted-form-shaping.md`:

```markdown
---
title: "LLM-Assisted Form Shaping"
order: 4
rubric: [model-functionality, innovation]
timing: "3 min"
audience: [evaluator, general]
---

# Shaping a Form with Natural Language

Forms Lab has two distinct LLM integration points. The first extracts structured specs from PDFs. The second — **form shaping** — lets Maya edit those specs by describing the change in plain language.

## What It Does

Maya types an intent into the editor: *"Combine the two employment pages into one"*, or *"Make the middle-name field optional and move it next to the last-name field"*. The LLM proposes a sequence of **domain commands**. Maya sees each proposed command as a plain-English line, reviews the preview of what the form will look like, and accepts, rejects, or refines the batch.

On accept, the batch executes atomically and produces one git commit plus a structured entry in `forms/<slug>/shaping-log.json`.

## The LLM Technique

Shaping uses **constrained generation via AI SDK tool-use**, not free-form JSON.

- Each command kind (`swapPages`, `moveGroup`, `relabelField`, `setRequired`, …) is registered as an AI SDK tool.
- Each tool's argument schema is the Zod schema for that command.
- The LLM **cannot** emit a command that doesn't match the schema — well-formedness is a modeling constraint, not a parsing hope.
- The server re-validates every command with the same Zod schema before the executor runs, and the executor performs state-aware semantic checks.

Three layers defend the filesystem from LLM output: tool grammar, server-side schema validation, executor semantic validation.

See [LLM tool-use as validation boundary](/catalog/decisions/architecture/llm-tool-use-as-validation-boundary) for the decision record.

## Why It's Interesting

- **Commands *are* the diff.** No separate differ runs. The humanized command list is both the proposal Maya reviews and the record of what changed.
- **Atomic batches.** A batch either fully applies or doesn't. Partial edits never reach git.
- **One foundation for two interaction modes.** A manual drag-drop in the structure panel would emit the same commands as the LLM. The LLM-driven path and the WYSIWYG path share one substrate.
- **Git-backed audit trail.** Every accepted batch is a commit. Every intent is logged with its resulting commit SHA. The shaping history is reconstructable from git alone.

## The Pivot

The first implementation had the LLM rewrite the whole `FormSpec` as free-form JSON; the server diffed before and after. That broke in practice — the LLM drifted (swapping page contents but keeping IDs in place), intent was lost (the differ had to infer semantics from structural diffs), and noisy diffs were the norm. The approach was replaced on the same branch before merge.

See the [shaping architecture experiment](/catalog/experiments/shaping-architecture) for the side-by-side comparison, and the [command-based shaping decision](/catalog/decisions/architecture/command-based-shaping) for the rationale.

See also: [Story #4](/catalog/stories/4-maya-shapes-the-form-experience) | [Architecture](/catalog/architecture/software-architecture)
```

- [ ] **Step 2: Render check**

```bash
bun run dev &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/catalog/walkthrough/04-llm-assisted-form-shaping
curl -s http://localhost:3000/catalog/walkthrough | grep -c "LLM-Assisted Form Shaping"
kill %1 2>/dev/null
```

Expected first command: `200`. Expected second command: `>= 1`.

- [ ] **Step 3: Do NOT commit yet** (combined with Task 16 commit)

---

## Task 12: Update walkthrough — "Our Approach" mentions two LLM integration points

**Files:**
- Modify: `catalog/walkthrough/02-our-approach.md`

- [ ] **Step 1: Add one line under "What Makes This Different"**

In `catalog/walkthrough/02-our-approach.md`, find the `## What Makes This Different` section. Change the existing bullets:

```markdown
## What Makes This Different

- **Not just chat**: The LLM does structured extraction, not conversational interaction
- **Systematic evaluation**: Every extraction is scored against ground truth with quantitative metrics
- **Production-grade**: Full deployment pipeline, not a notebook demo
- **Standards-compliant**: Output meets USWDS accessibility and design standards
```

to:

```markdown
## What Makes This Different

- **Two LLM integration points, not one**: structured extraction (PDF → spec) and constrained command generation (intent → edit batch). Both use different techniques — free-form structured output vs. tool-use — for different problems.
- **Not just chat**: The LLM does structured extraction and constrained command generation, not open-ended conversational interaction
- **Systematic evaluation**: Every extraction is scored against ground truth with quantitative metrics
- **Production-grade**: Full deployment pipeline, not a notebook demo
- **Standards-compliant**: Output meets USWDS accessibility and design standards
```

- [ ] **Step 2: Do NOT commit yet**

---

## Task 13: Update walkthrough — inference pipeline adds shaping path

**Files:**
- Modify: `catalog/walkthrough/07-inference-pipeline.md` (renamed in Task 10)

- [ ] **Step 1: Add a second pipeline section**

Open `catalog/walkthrough/07-inference-pipeline.md`. Find the `## Pipeline Architecture` section with its existing diagram:

```markdown
## Pipeline Architecture

​```
PDF Upload → PdfExtractor (strategy) → Bedrock API → Parse Response → DataCollectionSpec
​```

The pipeline follows a strategy pattern:

- **Interface**: `PdfExtractor` defines the extraction contract
- **Implementation**: `ApiPdfExtractor` calls Claude via Bedrock
- **Configuration**: Model ID, sampling parameters, and system prompt are configurable
```

Rename that section to `## Extraction Pipeline` and add a new sibling section immediately after it:

```markdown
## Shaping Pipeline

A second inference path handles LLM-assisted form shaping:

​```
Intent → AI SDK tool-use (Claude/Bedrock) → Command batch → Zod validation → Executor → Git commit
​```

- **Interface**: `FormShaper` — given a spec and a user intent, returns a command batch
- **Implementation**: `BedrockShaper` calls Claude with an array of registered AI SDK tools
- **Validation**: Every command is re-validated with its Zod schema server-side before the executor runs
- **Atomicity**: Either the whole batch applies or none of it does; partial edits never reach git

The two pipelines use the same Bedrock client but different sampling profiles. Extraction uses free-form structured output (the whole spec). Shaping uses tool-use mode, where the LLM can only emit calls matching registered tool schemas — well-formedness is a modeling constraint rather than a parse hope.

See the [LLM tool-use as validation boundary decision](/catalog/decisions/architecture/llm-tool-use-as-validation-boundary).
```

(Note: the four-backtick fences above represent triple backticks in the file; the backtick-around-backtick is only to escape them inside this plan.)

- [ ] **Step 2: Update the "See also" link at the bottom**

The current last line reads:

```markdown
See: [Story #3](/catalog/stories/3-maya-uploads-a-pdf-and-reviews-the-extracted-specs) | [Extraction Experiments](/catalog/experiments/pdf-field-extraction)
```

Change to:

```markdown
See: [Story #3](/catalog/stories/3-maya-uploads-a-pdf-and-reviews-the-extracted-specs) | [Story #4](/catalog/stories/4-maya-shapes-the-form-experience) | [Extraction Experiments](/catalog/experiments/pdf-field-extraction) | [Shaping Architecture Experiment](/catalog/experiments/shaping-architecture)
```

- [ ] **Step 3: Do NOT commit yet**

---

## Task 14: Update walkthrough — live demo adds "Shape a Form"

**Files:**
- Modify: `catalog/walkthrough/08-live-demo.md` (renamed in Task 10)

- [ ] **Step 1: Add a new section after "Upload and Extract"**

Open `catalog/walkthrough/08-live-demo.md`. Find the `## Upload and Extract` section. Immediately after it (before `## Fill a Form`), insert:

```markdown
## Shape a Form

1. From a project overview page, click **Edit**
2. Type an intent into the assistant panel: *"Combine pages 2 and 3"* or *"Make the middle-name field optional"*
3. See the LLM propose a batch of domain commands as plain-English lines
4. Review the live preview of what the form becomes after the batch is applied
5. Accept, reject, or type a refinement ("…but keep the employment page separate") to regenerate
6. On accept: a git commit is written, the shaping log is appended to, and the structure panel updates
```

- [ ] **Step 2: Do NOT commit yet**

---

## Task 15: Update walkthrough — remove shaping from What's Next

**Files:**
- Modify: `catalog/walkthrough/09-whats-next.md` (renamed in Task 10)

- [ ] **Step 1: Remove the shaping bullet from Planned Capabilities**

In `catalog/walkthrough/09-whats-next.md`, find the `## Planned Capabilities` list:

```markdown
## Planned Capabilities

- **Conversational form filling** — Carlos completes complex sections through dialogue with an LLM agent (Story #9)
- **LLM-assisted refinement** — Maya uses conversation to iteratively improve the data model (Story #8)
- **Advanced evaluation** — LLM-as-Judge scoring for richer, semantic evaluation of extraction quality
- **Form shaping** — Maya customizes delivery modes, page flow, and visual presentation (Story #4)
- **PDF generation** — Complete the round-trip: PDF in, web form, PDF out with filled data (Story #7)
```

Remove the "Form shaping" line:

```markdown
## Planned Capabilities

- **Conversational form filling** — Carlos completes complex sections through dialogue with an LLM agent (Story #9)
- **LLM-assisted refinement** — Maya uses conversation to iteratively improve the data model (Story #8)
- **Advanced evaluation** — LLM-as-Judge scoring for richer, semantic evaluation of extraction quality
- **PDF generation** — Complete the round-trip: PDF in, web form, PDF out with filled data (Story #7)
```

- [ ] **Step 2: Do NOT commit yet**

---

## Task 16: Update walkthrough test to match renumbered pages

**Files:**
- Modify: `test/catalog-walkthrough.test.ts`

The test file has a hard-coded slug list and a `'1 of 8'` assertion. Both must update for nine pages.

- [ ] **Step 1: Update the slug list and page count in the test**

In `test/catalog-walkthrough.test.ts`, replace the slug list:

```typescript
    const slugs = [
      '01-the-problem',
      '02-our-approach',
      '03-llm-assisted-extraction',
      '04-evaluation-and-experimentation',
      '05-production-infrastructure',
      '06-inference-pipeline',
      '07-live-demo',
      '08-whats-next',
    ]
```

with:

```typescript
    const slugs = [
      '01-the-problem',
      '02-our-approach',
      '03-llm-assisted-extraction',
      '04-llm-assisted-form-shaping',
      '05-evaluation-and-experimentation',
      '06-production-infrastructure',
      '07-inference-pipeline',
      '08-live-demo',
      '09-whats-next',
    ]
```

Then change the "1 of 8" assertion:

```typescript
    it('shows correct total page count in navigation', async () => {
      const res = await app.request('/catalog/walkthrough/01-the-problem')
      const body = await res.text()
      expect(body).toContain('1 of 8')
    })
```

to:

```typescript
    it('shows correct total page count in navigation', async () => {
      const res = await app.request('/catalog/walkthrough/01-the-problem')
      const body = await res.text()
      expect(body).toContain('1 of 9')
    })
```

- [ ] **Step 2: Run the walkthrough test**

```bash
bun test test/catalog-walkthrough.test.ts
```

Expected: PASS. All nine slugs render; the count assertion matches.

- [ ] **Step 3: Commit Tasks 10–16 together**

Tasks 10 through 16 are one logical change (renumber walkthrough + insert shaping page + update test). Commit them together:

```bash
git add catalog/walkthrough/ test/catalog-walkthrough.test.ts
git commit -m "docs(walkthrough): add LLM-assisted form shaping page; renumber

Inserts a new page at order 4 covering LLM tool-use form shaping.
Renumbers evaluation, production infrastructure, inference pipeline,
live demo, and what's next by +1. Adds shaping path to the inference
pipeline page, adds 'Shape a Form' section to the live demo, removes
shaping from planned-capabilities. Updates walkthrough test's slug
list and page count."
```

---

## Task 17: Create shaping-architecture experiment suite

**Files:**
- Create: `catalog/experiments/shaping-architecture/_suite.md`
- Create: `catalog/experiments/shaping-architecture/full-rewrite.md`
- Create: `catalog/experiments/shaping-architecture/command-based.md`

- [ ] **Step 1: Check the existing experiment frontmatter shape**

```bash
head -10 catalog/experiments/pdf-field-extraction/_suite.md
head -10 catalog/experiments/pdf-field-extraction/opus-baseline.md
```

Note the frontmatter conventions: `kind:` matches the directory; `status:` is `working` or `current`; variant files use `kind:` + `implementation:` + `status:` + `course-topics:`.

- [ ] **Step 2: Write the suite description**

Create `catalog/experiments/shaping-architecture/_suite.md`:

```markdown
---
kind: shaping-architecture
status: working
---

# LLM-Assisted Form Shaping: Architecture Evaluation

A qualitative comparison of two architectures for LLM-assisted editing of a form's `FormSpec` and `DataCollectionSpec`. Both approaches were implemented and driven against the same set of user intents during story-4 development. This experiment captures what was observed and why the team pivoted from the first approach to the second.

## Variants

| Variant | Approach | Outcome |
|---|---|---|
| full-rewrite | LLM returns a revised `FormSpec` as free-form JSON; server diffs before/after | Abandoned mid-story |
| command-based | LLM emits a sequence of domain commands via AI SDK tool-use | Shipped |

## Evaluation Method

**Qualitative, not metric-driven.** No automated benchmark exists here. Findings come from running both implementations against the same six representative intents:

1. "Swap pages 2 and 3"
2. "Combine the two employment pages into one"
3. "Make the middle-name field optional"
4. "Move 'military service' to page 4"
5. "Rename 'personal info' to 'applicant information'"
6. "Suggest delivery modes for each section based on complexity"

For each variant, we recorded: does the LLM produce a plausible result, does the result match intent, is the resulting diff legible to Maya, and does the implementation scale toward direct-manipulation editing (WYSIWYG).

## Why Capture This

The pivot from full-rewrite to command-based happened on one branch before merge. Without this record, the "why" lives only in commit history and a design note. An experiment page makes the reasoning reviewable alongside the rest of the project's LLM work.

## Course Topics

- LLM output structure: structured output vs. constrained tool-use
- Prompt drift and intent capture
- Multi-layer validation (model-level, schema-level, semantic-level)
```

- [ ] **Step 3: Write the full-rewrite variant**

Create `catalog/experiments/shaping-architecture/full-rewrite.md`:

```markdown
---
kind: shaping-architecture
implementation: full-rewrite
status: abandoned
course-topics: [llm-output-structure, prompt-drift]
---

# Full-spec rewrite (abandoned)

**Status:** abandoned mid-story

## Approach

The LLM received the current `FormSpec` plus Maya's intent and was asked to return a revised `FormSpec` as JSON. The server parsed the returned JSON, validated it against the `FormSpec` schema, and performed a structural diff before-vs-after to surface "what changed" in the UI.

## Observed Failure Modes

### Drift

Asked to *"swap pages 2 and 3"*, Claude preserved the page IDs in position and swapped their contents — titles, group IDs, and field ordering moved between two stable parent records. The structural diff reported "two pages heavily modified" rather than "two pages reordered". Other intents produced similar class of drift: asked to combine two groups, Claude sometimes created a new group and moved fields into it rather than reusing an existing group ID.

### Intent Loss

The server had no first-class record of what Maya asked for. The diff was the only artifact. Any intent that matched several possible structural outcomes (and most did) produced a diff that was ambiguous about *why* changes happened.

### Noisy Diffs

Even semantically trivial edits produced structurally-significant diffs when Claude normalized whitespace in help text, re-quoted strings differently, or rewrote redundant-but-present fields.

### Ceiling Against WYSIWYG

A future drag-drop editor has to translate a click-and-drag into an atomic operation. "Produce a revised `FormSpec`" is not that operation. Building direct manipulation on top of this approach would mean maintaining two distinct edit paths (LLM → full spec, drag → command-or-patch), with no obvious unification.

## Why Abandoned

The failure modes weren't fixable through prompt tuning. The abstraction — "let the LLM rewrite the whole document" — was the problem. The team pivoted to command-based editing before merging the branch.
```

- [ ] **Step 4: Write the command-based variant**

Create `catalog/experiments/shaping-architecture/command-based.md`:

```markdown
---
kind: shaping-architecture
implementation: command-based
status: current
course-topics: [llm-tool-use, constrained-generation, multi-layer-validation]
---

# Command-based shaping (shipped)

**Status:** shipped on main (2026-04-15, PR #42)

## Approach

Edits are expressed as a sequence of **commands** — a discriminated union of domain operations (`swapPages`, `moveGroup`, `relabelField`, …). `src/services/forms/shaping/commands.ts` defines the vocabulary; Zod schemas sit alongside each variant.

Each command kind is registered as an AI SDK tool in `src/services/forms/shaping/tools.ts`. The LLM, invoked via `BedrockShaper`, can only emit tool calls matching those schemas — Claude cannot produce an ill-formed command.

Server-side, each command is re-validated with the same Zod schema before execution. The executor (`executor.ts`) runs state-aware semantic checks (does this page ID exist? does removing this group leave orphan fields?) and applies the batch atomically, rolling back on any failure.

## How It Addresses the Prior Failure Modes

- **Drift eliminated at the grammar level.** "Swap pages 2 and 3" becomes a single `swapPages(id1, id2)` tool call. The LLM cannot accidentally produce a structure that means something else — there is no "other structure" available to it.
- **Intent captured as data.** The command sequence *is* the semantic intent. The humanizer (`humanize.ts`) renders each command as natural language for Maya to review, and the shaping log (`forms/<slug>/shaping-log.json`) records the full batch alongside the originating free-text intent and the resulting git SHA.
- **Diffs are never noisy.** A batch of N commands produces exactly N lines of humanized output. No whitespace noise, no structural churn.
- **One foundation, two interaction modes.** A future drag-drop in `flex-form-structure` emits the same commands as the LLM. The LLM-driven path and the WYSIWYG path share one executor and one atomicity guarantee.

## Trade-offs Taken

- **Commands span both domain layers.** Page/group commands touch `FormSpec`; field commands touch `DataCollectionSpec`. This broadens Maya's edit surface past what Story 3 strictly required. Called out as a deliberate scope expansion in the command-based shaping ADR.
- **Batch atomicity, not per-command acceptance.** Maya accepts or rejects a whole batch. Per-command approval is deferred — the architecture supports it but the UI doesn't.
- **No optimistic-concurrency guard yet.** Two tabs editing the same project could confuse each other. Acceptable for single-user v1.

## Validation Defense in Depth

Three layers defend `FormSpec`/`DataCollectionSpec` integrity from LLM output:

1. **Tool grammar** (provider-enforced) — Claude can only emit calls matching declared schemas.
2. **Zod re-validation** (server-enforced) — the server doesn't trust the SDK or the provider to be correct.
3. **Executor semantic validation** (state-aware) — well-formed ≠ semantically valid; the executor runs state checks and can reject.

See the [LLM tool-use as validation boundary decision](/catalog/decisions/architecture/llm-tool-use-as-validation-boundary).
```

- [ ] **Step 5: Render check**

```bash
bun run dev &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/catalog/experiments/shaping-architecture
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/catalog/experiments/shaping-architecture/full-rewrite
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/catalog/experiments/shaping-architecture/command-based
kill %1 2>/dev/null
```

Expected: `200 200 200`.

- [ ] **Step 6: Commit**

```bash
git add catalog/experiments/shaping-architecture/
git commit -m "docs(experiments): add shaping architecture experiment record"
```

---

## Task 18: Update flight board — move story 4 to Landed

**Files:**
- Modify: `notes/flight-board.md`

- [ ] **Step 1: Rewrite the flight board**

The current file is:

```markdown
# Flight Board

| Story | Branch | Status | Worktree | Updated |
|-------|--------|--------|----------|---------|
| #4 Maya shapes the form experience | story-4/form-shaping | pr-open (#42) | .worktrees/story-4-form-shaping | 2026-04-15 |
```

Replace with:

```markdown
# Flight Board

## In Flight

_(none)_

## Landed

| Story | Branch | Status | PR | Merged |
|-------|--------|--------|----|--------|
| #4 Maya shapes the form experience | story-4/form-shaping | shipped | #42 | 2026-04-15 |
```

- [ ] **Step 2: Commit**

```bash
git add notes/flight-board.md
git commit -m "docs(flight-board): move story 4 to Landed section"
```

---

## Task 19: Full verification

- [ ] **Step 1: Run `bun run check`**

```bash
bun run check
```

Expected: all checks pass — lint, type check, tests green.

- [ ] **Step 2: Manual visual verification**

```bash
bun run dev
```

In a browser, visit (or `curl -s -o /dev/null -w "%{http_code}\n"` each):

- `/catalog/decisions/architecture/command-based-shaping` → 200, content renders
- `/catalog/decisions/architecture/llm-tool-use-as-validation-boundary` → 200, content renders
- `/catalog/decisions/architecture/coordinator-custom-elements` → 200, content renders
- `/catalog/stories/4-maya-shapes-the-form-experience` → 200, ACs are checked correctly
- `/catalog/architecture/software-architecture` → 200, shaping service bullet visible
- `/catalog/architecture/data-model` → 200, Shaping Commands section visible
- `/catalog/architecture/threat-model` → 200, two new threat bullets + changelog row visible
- `/catalog/architecture/system-overview` → 200, Data Flow step 2 updated
- `/catalog/walkthrough` → 200, lists 9 pages in order, new shaping page at position 4
- `/catalog/walkthrough/04-llm-assisted-form-shaping` → 200, content renders
- `/catalog/walkthrough/07-inference-pipeline` → 200, shows Extraction + Shaping pipelines
- `/catalog/walkthrough/08-live-demo` → 200, includes "Shape a Form" section
- `/catalog/walkthrough/09-whats-next` → 200, no "Form shaping" bullet
- `/catalog/experiments/shaping-architecture` → 200, suite page with two run links
- `/catalog/experiments/shaping-architecture/full-rewrite` → 200
- `/catalog/experiments/shaping-architecture/command-based` → 200

Kill the dev server.

- [ ] **Step 3: Check that all internal links resolve**

From the repo root:

```bash
git grep -n "\[.*\](\.\./decisions/architecture/command-based-shaping" -- catalog/
git grep -n "\[.*\](\.\./decisions/architecture/llm-tool-use-as-validation-boundary" -- catalog/
git grep -n "\[.*\](\.\./decisions/architecture/coordinator-custom-elements" -- catalog/
git grep -n "/catalog/decisions/architecture/command-based-shaping" -- catalog/
git grep -n "/catalog/experiments/shaping-architecture" -- catalog/
```

Each should return at least one match. If any target file path referenced in the output doesn't exist, fix the link.

- [ ] **Step 4: Final status check**

```bash
git status
git log --oneline main..HEAD
```

Expected: working tree clean; commits on `main` correspond to each task group above.

- [ ] **Step 5: No further commit** — verification only.

---

## Self-review notes

- The walkthrough renderer sorts by integer `order`, so fractional orders are not supported. Plan renumbers instead. Verified against `src/entrypoints/app/routes/catalog/walkthrough.tsx:38` (`parseInt(file.frontmatter.order || '0', 10)`) and the sort call at line 49.
- The walkthrough test file (`test/catalog-walkthrough.test.ts`) has a hard-coded slug list and a `'1 of 8'` assertion — both updated in Task 16.
- ADR frontmatter follows the existing precedent from `form-project-repos-and-permissions.md` (`status`, `tags`, `decided`). Content style (Context / Decision / Consequences, with a `## Sources` footer) also matches precedent.
- Experiment frontmatter matches `pdf-field-extraction` precedent: `kind:` on both `_suite.md` and variant files; variants also carry `implementation:`, `status:`, `course-topics:`.
- Task 10 (rename) intentionally leaves the tree in a broken state that Tasks 11–16 complete; the combined commit at the end of Task 16 keeps history coherent. An executor that stops between Task 10 and Task 16 will see a failing test until Task 16 finishes.
- No source code outside `test/catalog-walkthrough.test.ts` is modified. The dependency-rule test, type checks, and all non-walkthrough tests should pass unchanged.
