# Catalog Post-Shaping Audit & Update — Design

**Date:** 2026-04-17
**Scope:** Reflect story-4 (form shaping) work in the catalog, and take an evaluator-driven pass at gaps that will cost rubric points.

## Context

Two story-4 PRs have merged to main:

- **PR #42** (`story-4/form-shaping`, merged 2026-04-15) — command-based shaping, AI SDK tool-use, three-panel editor, initial structure sidebar with page reorder + delivery mode.
- **PR #54** (`story-4/direct-edit-ui`, merged after #42) — direct-manipulation WYSIWYG editors for page/group/field (click to edit, chips + expanders), unified staged-changes buffer, single `/edit/save` commit endpoint with `parentSha` guard, `/edit/accept` and `/edit/execute` removed, `flex-editable-page` replaces the preview iframe, "Preview as applicant" toggle.

The catalog does not yet reflect any of this. Specifically:

- Shaping is still listed under "Planned Capabilities"
- The command-based architecture is undocumented
- The LLM tool-use integration technique is undocumented
- The custom-element coordinator pattern (now with a unified staged buffer) is undocumented
- The first-round → second-round pivot is rubric-rewarded as systematic engineering but exists only in notes
- The unified-buffer + single-save architecture — which realizes the ADR's "one foundation for LLM and direct-manipulation editing" claim — is invisible
- A few threats surfaced in story-4 code review are missing from the threat model, and the threat model's route references (`/accept`, `/execute`) are stale

A secondary driver: the final presentation is ~April 20. Model & Inference is 40/100 rubric points. The walkthrough currently pitches one LLM integration point (extraction). Shaping is a second, technically distinct integration point (tool-use / constrained generation / schema as validation boundary) and is currently invisible to an evaluator.

Canonical sources for this work:
- `notes/2026-04-15-command-based-shaping-design.md` (command-based shaping design)
- `notes/2026-04-16-layout-overhaul-design.md` (three-panel editor)
- `notes/2026-04-16-direct-edit-ui-design.md` (direct-manipulation edit UI + staged buffer)
- `notes/story-4-form-shaping/review.md` (code review, AC coverage, deferred items)

## Decisions

- **Medium scope.** Reflect what shipped + take an evaluator-driven gap pass. Do not touch stories 5–9 or refactor catalog structure.
- **Three small ADRs, not one combined ADR.** Existing ADRs in `catalog/decisions/architecture/` are single-concern; match precedent.
- **Add a new walkthrough page for shaping** rather than expanding an existing page. Shaping as a peer to extraction frames the project correctly for the evaluator.
- **Promote the pivot to an experiment record.** The systematic-engineering framing is worth the ~30 minutes.

## Changes

### 1. Catalog truthfulness

**1.1** `catalog/stories/4-maya-shapes-the-form-experience.md`
- Mark ACs post-PR-#54. Most "deferred" items from the #42 review are now shipped: direct group/field UI, optimistic concurrency (`parentSha`), manual reorder + delivery mode. Only a dedicated suggest-modes prompt button remains explicitly deferred.
- Add `## Implementation Notes` under `## Notes` summarizing both PRs: command-based architecture + tool-use + coordinator + shaping log (PR #42), and direct-manipulation WYSIWYG editors + unified staged buffer + single `/edit/save` commit path + `parentSha` guard (PR #54).
- Add links to the three new ADRs, the unified-buffer ADR, and the shaping-architecture experiment.

**1.2** `catalog/walkthrough/08-whats-next.md`
- Remove "Form shaping" bullet from Planned Capabilities.

**1.3** `catalog/architecture/data-model.md`
- Fix stale `src/types/models.ts` reference (line 51). Replace with pointers to `src/services/data-collection/types.ts` and `src/services/forms/types.ts`.
- Add short section **Shaping Commands** as a peer concept. Commands span DataCollectionSpec (field-level) and FormSpec (structural). Reference the command vocabulary in `src/services/forms/shaping/commands.ts`.

**1.4** `notes/flight-board.md`
- Move #4 row to a new "Landed" section; PR #42 merged 2026-04-15.

**1.5** `catalog/personas/maya.md`
- No change. Re-read confirms persona text is already consistent with what shipped.

### 2. New ADRs

Location: `catalog/decisions/architecture/`. Four small ADRs.

**2.1 `command-based-shaping.md`** (`decided: 2026-04-15`)
- Decision: canonical representation of a FormSpec/DataCollectionSpec edit is a sequence of domain commands, not a revised spec.
- Context: first-round full-rewrite drifted (LLM shuffled page IDs, produced noisy diffs), lost intent (differ had to infer semantics from structural diffs), didn't scale toward WYSIWYG.
- Consequences: command vocabulary spans both domain layers (deliberate broadening of Maya's edit scope from Story 3). Batch-atomic execution with rollback. Shaping log is separate from git commit because some intents produce multi-command batches.
- Sources: design doc, `services/forms/shaping/commands.ts`, `services/forms/shaping/executor.ts`.

**2.2 `llm-tool-use-as-validation-boundary.md`** (`decided: 2026-04-15`)
- Decision: Claude emits commands via AI SDK tool-use mode. Each command kind is a Zod-backed tool. Server re-validates with the same Zod schemas before the executor runs.
- Context: free-form JSON LLM output requires fragile parsing and leaves ambiguity about whether malformed output is an attack or a generation failure. Tool-use makes well-formedness a modeling constraint and lets the schema be the single source of truth for "what the LLM is allowed to say."
- Consequences: three layers of defense — tool-use grammar, Zod schema, executor semantic validation. Adding a new command kind is a single-file change (tool definition + executor case). Threat model entry for shaping cites schema validation as the primary integrity boundary.
- Sources: `services/forms/shaping/tools.ts`, `services/forms/shaping/bedrock-shaper.ts`.

**2.3 `coordinator-custom-elements.md`** (`decided: 2026-04-16`)
- Decision: interactive editor UI is composed of custom elements. One root `flex-form-editor` coordinator owns ephemeral state and mediates between children via typed `CustomEvent`s. No React/Vue/etc.
- Context: the editor is the project's most interactive surface. A full client framework would conflict with P2 (design-system depends only on `shared/`), P4 (presentation is stateless — but editor state is real), and the project's Hono-JSX / server-rendered posture. Custom elements are a natural fit because the server still renders initial HTML; elements attach behavior.
- Consequences: each child element (`flex-form-structure`, `flex-assistant`, `flex-editable-page`, `flex-editable-group`, `flex-editable-field`, `flex-staged-changes`) is independently testable. The event protocol is the contract. Pattern generalizes to any future editor-style UI without reaching for a framework. Trade-off: client logic is spread across files; no component-tree time-travel debugging.
- Sources: `src/design-system/components/flex-form-editor/`, `notes/2026-04-16-layout-overhaul-design.md`, `notes/2026-04-16-direct-edit-ui-design.md`.

**2.4 `unified-staged-buffer.md`** (`decided: 2026-04-17`) — **new in this update**
- Decision: direct-manipulation edits and LLM-proposed edits share one client-side staged buffer. Maya commits the buffer via a single `POST /edit/save` (one git commit per save). `/edit/accept` and `/edit/execute` were removed in favor of this unified path.
- Context: PR #42 had two commit endpoints — `/edit/execute` for manual structure-sidebar commands (one commit each) and `/edit/accept` for LLM batches (one commit per accepted batch). PR #54 introduced direct-manipulation editors for the other ~20 commands. Keeping three commit paths would have fragmented the history (commit-per-keystroke) and defeated the atomic-batch guarantee. Unifying the buffer made routine editing coherent: type a label, mark something required, move a field, accept a chat suggestion — all accumulate; one Save; one commit.
- Consequences: `parentSha` optimistic-concurrency guard on `/edit/save` (two tabs can no longer silently clobber). `source` field on shaping-log entries (`manual` vs `llm`) preserves the audit distinction even when a buffer mixes both. Save/Discard/staged-count live in the breadcrumb; `beforeunload` warns on navigation with pending commands. Deferring Save means a project page reload loses the buffer — acceptable trade-off for v1.
- Sources: `src/entrypoints/app/routes/owner/edit/index.tsx` (`/edit/save`), `src/design-system/components/flex-form-editor/`, `flex-staged-changes/`, `notes/2026-04-16-direct-edit-ui-design.md`.

### 3. Architecture docs

**3.1** `catalog/architecture/software-architecture.md`
- Add `forms/shaping/` bullet under `src/services/` listing: `commands.ts`, `executor.ts`, `humanize.ts`, `projector.ts`, `tools.ts`, `bedrock-shaper.ts`, and `shaping log`.
- Extend "Current state → Isolated" to include `AI SDK tool-use` (contained to `services/forms/shaping/`).
- Link the four new ADRs from `## Sources`.

**3.2** `catalog/architecture/threat-model.md`
- Under the existing "Hono application to LLM (form shaping)" section, update stale route references: `/edit/accept` and `/edit/execute` are gone; `/edit/intent` and `/edit/save` are the relevant routes. Note that `/edit/save` enforces `parentSha`-based optimistic concurrency.
- Add two threats from the review:
  - **LLM cost abuse via refinement loop.** An attacker who is already an authenticated project owner can type refinement feedback repeatedly. Low severity; cost controls tracked as a follow-up.
  - **Prompt injection via refinement feedback (`previousAttempt.feedback`).** Low severity given attacker must be project owner; worth documenting the surface.
- Add a changelog entry dated 2026-04-17: "Added refinement-loop abuse and refinement-feedback prompt-injection threats; updated shaping route references for unified `/edit/save` (PR #54)."

**3.3** `catalog/architecture/system-overview.md`
- Data Flow step 2 currently says "Maya shapes FormSpec … via authoring UI." Expand: "via LLM-assisted command-based editor; commands execute atomically and are logged."
- No structural changes.

### 4. Walkthrough

**4.1** New page: `catalog/walkthrough/04-llm-assisted-form-shaping.md`
- Renumber existing pages 04–08 to 05–09 (walkthrough sort is integer `parseInt`, no fractional support — verified in `src/entrypoints/app/routes/catalog/walkthrough.tsx:38,49`).
- Frontmatter: `order: 4`, `rubric: [model-functionality, innovation]`, `timing: "3 min"`, `audience: [evaluator, general]`.
- Sections:
  - **What It Does** — two interaction paths share one substrate. Direct manipulation: click a label to rename, toggle required, reorder pages with arrows, pick delivery modes from a dropdown. LLM assistance: type a higher-level intent ("split the employment page by pre- and post-2020 work") and accept a proposed batch. Both paths stage into one buffer; one Save writes one git commit.
  - **The LLM Technique** — constrained generation via AI SDK tool-use. Each command kind is a tool with a Zod schema. The LLM cannot emit ill-formed commands; the schema is the grammar.
  - **Why It's Interesting** — commands *are* the diff. Executor is deterministic. Atomic batch semantics per Save. Direct edits and LLM batches compose into one buffer before commit — the "one foundation for LLM-driven and direct-manipulation editing" claim is realized, not aspirational.
  - **The Pivot** — one short paragraph. First approach had the LLM rewrite the full FormSpec; drift and lost intent made it unsalvageable. Commands solved both, and the subsequent direct-manipulation work was possible only because commands were already the canonical edit unit.
  - Links: story #4, four ADRs (command-based, tool-use boundary, coordinator, unified buffer), `services/forms/shaping/`, `catalog/experiments/shaping-architecture/`.

**4.2** `catalog/walkthrough/02-our-approach.md`
- In "What Makes This Different", add one line: the project has **two** distinct LLM integration points — structured extraction (PDF → spec) and constrained command generation (intent → edit batch).

**4.3** `catalog/walkthrough/07-inference-pipeline.md` (renumbered from 06)
- Add a second pipeline box after the extraction one:
  ```
  Intent → AI SDK tool-use (Claude/Bedrock) → Command batch → Staged buffer → /edit/save → Zod + executor validation → Git commit
  ```
- Add short subsection noting: different sampling profile (tool-use mode, higher structure constraint), same Bedrock client, different validation strategy (schema-as-grammar vs. JSON parse-and-validate). The LLM batch is *staged* alongside any direct edits before the one Save commit.

**4.4** `catalog/walkthrough/08-live-demo.md` (renumbered from 07)
- New "Shape a Form" section after "Upload and Extract". Cover both paths: (1) click a field label to rename, toggle required, reorder pages — each click stages a command; (2) type a higher-level intent into the chat ("combine pages 2 and 3"), accept the proposed batch into the staged buffer; (3) click Save to commit everything as one git commit. Mention the "Preview as applicant" toggle as a way to validate the result.

### 5. Experiments

**5.1** New directory: `catalog/experiments/shaping-architecture/`
- Before writing, read `catalog/experiments/pdf-field-extraction/_suite.md` and one variant file to confirm the frontmatter shape (fields like `variants`, metric columns, etc.). The shaping experiment is qualitative, so some metric-oriented fields will be intentionally empty or omitted; match the schema where it applies.
- `_suite.md` — framing: qualitative comparison of two architectures for LLM-assisted form editing, driven by the same set of user intents.
- `full-rewrite.md` — first-round approach. What it did (LLM returned revised FormSpec; server diffed). Observed failure modes (LLM drift, intent loss, noisy diffs). Why the approach hit a ceiling.
- `command-based.md` — second-round approach. What it does (LLM emits commands via tool-use). Why it fixes the failure modes. Trade-offs taken. **Includes a follow-on section** noting that PR #54's direct-manipulation WYSIWYG editors reuse the same command substrate, unified staged buffer, and `/edit/save` path — concrete evidence that "one foundation for LLM and direct editing" was not just a claim.
- Clearly labeled: **qualitative architectural evaluation, no automated metrics** — findings derived from driving both implementations against the same intents during story-4 work.

## Out of Scope

- Editing stories 5–9 (describe future work, still accurate).
- Refactoring catalog structure or routes.
- Promoting design-notes-under-`notes/` to catalog (session artifacts belong where they are).
- A dedicated design-system page for `flex-form-editor` (registry auto-surfaces components; the *pattern* belongs in an ADR).
- Per-command-acceptance UI, group-move UI, dedicated suggest-modes UI (tracked as story-4 follow-ups in the review doc).

## Implementation Order

Linear — later changes link to earlier artifacts:

1. Three ADRs (2.1–2.3).
2. Story 4 update (1.1).
3. Architecture docs (3.1–3.3).
4. Walkthrough (4.1–4.4).
5. Experiments (5.1).
6. Housekeeping (1.2–1.4).
7. Verify: `bun run check`, visually confirm the new walkthrough page renders in dev.

## Testing / Verification

- `bun run check` — lint, type check, tests. No code changes expected, but markdown links and frontmatter could break some catalog renderers; the existing tests cover walkthrough/catalog parsing.
- Manual: `bun run dev`, visit `/catalog/walkthrough/03b-llm-assisted-form-shaping`, `/catalog/stories/4-…`, `/catalog/experiments/shaping-architecture/…`, `/catalog/decisions/architecture/command-based-shaping` (and the other two ADRs). Confirm sidebar placement and cross-links render.

## Effort Estimate

3–5 hours. ADRs ~45 min total; new walkthrough page ~30 min; experiment writeup ~30 min; edits to existing files ~90 min; verification ~30 min.
