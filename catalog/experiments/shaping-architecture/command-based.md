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
- **Per-command acceptance deferred.** Maya accepts or rejects a whole LLM batch. Per-command approval is deferred — the architecture supports it but the UI doesn't.

## Validation Defense in Depth

Three layers defend `FormSpec`/`DataCollectionSpec` integrity from LLM output:

1. **Tool grammar** (provider-enforced) — Claude can only emit calls matching declared schemas.
2. **Zod re-validation** (server-enforced) — the server doesn't trust the SDK or the provider to be correct.
3. **Executor semantic validation** (state-aware) — well-formed ≠ semantically valid; the executor runs state checks and can reject.

See the [LLM tool-use as validation boundary decision](/catalog/decisions/architecture/llm-tool-use-as-validation-boundary).

## Follow-on: Direct Manipulation on the Same Substrate

The command-based architecture predicted that direct-manipulation editing would share a foundation with LLM-assisted editing. **PR #54 shipped that follow-on** — click-to-edit WYSIWYG editors for pages, groups, and fields. Every direct edit emits the same `Command` type the LLM produces. Both paths stage into one client-side buffer; one **Save** commits the whole buffer as one git commit via `POST /edit/save` with a `parentSha` optimistic-concurrency guard.

This is what the prediction in the pivot rationale — *"manual UI operations (future drag-drop) would emit the same commands"* — actually looks like when realized:

- A click on a field label emits `relabelField` via `formeditor:stage-command`.
- An LLM batch from chat stages via `formeditor:stage-batch` into the same buffer.
- The coordinator re-projects state from canonical + buffer after every change; editors re-render from the projected state.
- Save is the single commit path. `/edit/accept` and `/edit/execute` were removed.

See the [unified staged buffer decision](/catalog/decisions/architecture/unified-staged-buffer) for the rationale and the [coordinator custom elements decision](/catalog/decisions/architecture/coordinator-custom-elements) for the client-side pattern.
