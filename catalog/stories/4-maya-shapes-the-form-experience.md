---
issue: 4
title: Maya shapes the form experience
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-09T14:40:12.308Z
---

## User Story:

As a **form creator (Maya)**, in order to **control how applicants experience the form**, I want **to reorder pages, adjust section grouping, pick delivery modes, and see a live preview of my changes**

## Preconditions:

- A FormProject exists with extracted DataCollectionSpec and FormSpec (Slice 2)
- Maya is authenticated

## Acceptance Criteria:

- [x] Maya can view the current FormSpec for a project
- [x] Maya can describe changes in natural language and see the LLM propose concrete edits
- [x] Proposed edits are shown as a humanized command list (the commands *are* the diff)
- [x] Maya can accept, reject, or refine an LLM-proposed batch
- [x] Maya can directly manipulate pages (rename, add, delete, reorder, set delivery mode)
- [x] Maya can directly manipulate groups (rename, add, delete, add field)
- [x] Maya can directly manipulate fields (rename, required toggle, change type/control/sensitivity, set condition, move, delete)
- [x] Direct edits and LLM-accepted batches stage into one buffer; one Save = one git commit
- [x] Save enforces optimistic concurrency via `parentSha` to prevent two-tab clobbering
- [x] Preview renders the page as Carlos would see it; "Preview as applicant" toggles between edit and applicant view
- [x] Changes are durably recorded in git plus a structured `shaping-log.json`
- [ ] Dedicated one-click "suggest delivery modes" button (partial — the LLM can emit `setDeliveryMode` via tool use, but no dedicated button)

## Success Metrics:

- Maya can complete a form shaping session in under 10 minutes
- LLM delivery mode suggestions align with section complexity

## Notes:

- Direct manipulation and LLM assistance share one foundation: both emit the same `Command` values, both stage into one client buffer, both commit via `POST /edit/save`. See [Unified staged buffer](../decisions/architecture/unified-staged-buffer.md).
- The LLM uses constrained generation: each command kind is an AI SDK tool with a Zod schema. See [LLM tool-use as validation boundary](../decisions/architecture/llm-tool-use-as-validation-boundary.md).
- Commands span both domain layers (structural edits to `FormSpec`, field edits to `DataCollectionSpec`). This is a deliberate broadening of Story 3's extraction output. See [Command-based form shaping](../decisions/architecture/command-based-shaping.md).
- The editor UI uses a coordinator custom-element pattern rather than a client framework. See [Coordinator custom elements](../decisions/architecture/coordinator-custom-elements.md).
- Context for why the implementation pivoted mid-story: [Shaping architecture experiment](../experiments/shaping-architecture/).

## Implementation Notes:

**Shipped (PR #42 — command-based shaping):**

- Command vocabulary spanning page, group, and field operations (`src/services/forms/shaping/commands.ts`)
- Atomic batch executor with rollback (`executor.ts`)
- AI SDK tool-use integration against Bedrock (`bedrock-shaper.ts`, `tools.ts`)
- Humanizer that renders commands as natural-language lines (`humanize.ts`)
- Three-panel editor layout (structure / preview / assistant) with collapsible panels
- Git-backed audit trail: one commit per accepted batch plus structured `shaping-log.json`
- Accept / reject / refine loop with persistent chat transcript

**Shipped (PR #54 — direct-manipulation edit UI):**

- WYSIWYG editors for page/group/field (`flex-editable-page`, `flex-editable-group`, `flex-editable-field`) — click-to-edit labels, chips for type/required, "…more" expander for sensitivity/control/condition/move-to-group/change-type
- Unified staged-changes buffer held by `flex-form-editor`; `flex-staged-changes` popover lists pending commands with per-entry remove
- Single commit endpoint `POST /edit/save`; `/edit/accept` and `/edit/execute` removed
- `parentSha` optimistic-concurrency guard on `/edit/save`; 409 on stale parent
- `flex-editable-page` replaces the preview iframe; "Preview as applicant" toggle shows the applicant-facing view
- `source` field on shaping-log entries (`manual` vs `llm`) preserved across the unified path

**Deferred follow-ups:**

- Dedicated one-click "suggest delivery modes" prompt button (LLM can emit the command today, but no dedicated button)
- Drag-and-drop for pages/groups/fields (arrows + dropdowns cover the common case)
- Server-side draft persistence — staged buffer is client-only; `beforeunload` warns on navigation
- Live preview of conversational delivery mode
- Playwright behavioral tests for custom elements (executor and integration-save tests are green; end-to-end custom-element tests remain)
- Move shared `commands.ts` + `humanize.ts` to `src/shared/shaping/` to eliminate humanizer duplication — requires an ADR amendment to the `import type` exclusion in the dependency-rule test

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable
