---
title: "LLM-Assisted Form Shaping"
order: 4
rubric: [model-functionality, innovation]
timing: "3 min"
audience: [evaluator, general]
---

# Shaping a Form — Direct Manipulation Meets LLM Assistance

Forms Lab has two distinct LLM integration points. The first extracts structured specs from PDFs. The second — **form shaping** — is how Maya edits those specs. Two interaction modes share one foundation: she can click to edit directly, or describe a higher-level intent to the assistant. Both paths stage into one buffer; one Save writes one git commit.

## Two Paths, One Substrate

**Direct manipulation (routine edits).** Maya clicks a field label and types a new one. She toggles "required" on and off. She picks a delivery mode from a dropdown. She reorders pages with arrows, adds a group, deletes a field. Each click emits a domain `Command` — the same type of value the LLM produces.

**LLM assistance (higher-level intents).** Maya types into the chat: *"Combine the two employment pages into one,"* or *"Split personal information by dependent status."* Claude proposes a batch of commands. Maya reviews them as plain-English lines, accepts, rejects, or refines.

Both paths stage into the same client-side buffer. The breadcrumb shows "Save (N pending)." One click commits every pending change atomically as one git commit. The [unified staged buffer ADR](/catalog/decisions/architecture/unified-staged-buffer) covers the decision.

## The LLM Technique

Shaping uses **constrained generation via AI SDK tool-use**, not free-form JSON.

- Each command kind (`swapPages`, `moveGroup`, `relabelField`, `setRequired`, `addField`, `changeFieldType`, …) is registered as an AI SDK tool.
- Each tool's argument schema is the Zod schema for that command.
- The LLM **cannot** emit a command that doesn't match the schema — well-formedness is a modeling constraint, not a parsing hope.
- The server re-validates every command with the same Zod schema before the executor runs, and the executor performs state-aware semantic checks.

Three layers defend the filesystem from LLM output: tool grammar, server-side schema validation, executor semantic validation. See [LLM tool-use as validation boundary](/catalog/decisions/architecture/llm-tool-use-as-validation-boundary).

## Why It's Interesting

- **Commands *are* the diff.** No separate differ runs. The humanized command list is both what Maya reviews and what gets recorded.
- **Atomic batches.** Save writes one commit. Either the whole buffer applies or none of it does. Partial edits never reach git.
- **One foundation for two interaction modes, demonstrated.** Direct manipulation and LLM assistance aren't parallel systems — they're the same system with different input sources. A click to rename a field and an LLM batch to split a page compose into one buffer before commit.
- **Optimistic concurrency.** `parentSha` on every Save. Two tabs can't silently clobber.
- **Git-backed audit trail.** Every Save is a commit. Every intent is logged with its resulting commit SHA. The shaping history is reconstructable from git alone.

## The Pivot

The first implementation had the LLM rewrite the whole `FormSpec` as free-form JSON; the server diffed before and after. That broke in practice — the LLM drifted (swapping page contents but keeping IDs in place), intent was lost (the differ had to infer semantics from structural diffs), and noisy diffs were the norm. The approach was replaced on the same branch before merge.

The payoff is visible in what came after. With commands as the canonical edit unit, the direct-manipulation WYSIWYG editors landed as a natural follow-up: a click emits a command; the command stages into the same buffer an LLM batch would land in; one Save path commits both. The "one foundation" claim turned into shipped code.

See the [shaping architecture experiment](/catalog/experiments/shaping-architecture) for the side-by-side comparison, and the [command-based shaping decision](/catalog/decisions/architecture/command-based-shaping) for the rationale.

See also: [Story #4](/catalog/stories/4-maya-shapes-the-form-experience) | [Architecture](/catalog/architecture/software-architecture)
