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

**Commands span both domain layers.** Page/group-structural commands modify `FormSpec`. Field-level commands (label, required, help text, control) modify `DataCollectionSpec`. This is a deliberate broadening of Maya's edit surface compared to Story 3, which only established `DataCollectionSpec` as an extraction target.

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
