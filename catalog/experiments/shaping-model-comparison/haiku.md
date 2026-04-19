---
kind: shaping-commands
implementation: bedrock-haiku
status: current
course-topics: [evaluation, model-selection]
---

# Form Shaping: Claude Haiku 4.5

> Selectable in **Settings → Variants → Shaping**.

**Status:** experimental

## Summary

| Metric | Value |
|---|---|
| Command-Kind Recall | 66.7% |
| Command-Kind Precision | 83.3% |
| Argument Accuracy | 61.7% |

_Run timestamp: 2026-04-19T15:36:40.595Z. Spec version: 2026-04-19._

## Approach

Uses `createBedrockFormShaper({ model: HAIKU_MODEL_ID })` with the standard 25-command tool-use prompt. Haiku is the fastest and cheapest model in the comparison. Each scripted intent is evaluated against expected `Command[]` output via the `shaping-commands` kind (deterministic: kind precision/recall + argument accuracy, no LLM judge).

## Per-intent Results

| Intent | Recall | Precision | Arg Acc | Matched | Missing | Extra |
|---|---|---|---|---|---|---|
| swap-pages | 100% | 100% | 100% | swapPages | — | — |
| merge-employment | 100% | 100% | 100% | mergePages | — | — |
| optional-middle-name | 100% | 100% | 100% | setRequired | — | — |
| move-military | 0% | 100% | 0% | — | moveGroup | — |
| rename-personal-info | 0% | 0% | 0% | — | renamePage | renameGroup |
| suggest-delivery-modes | 100% | 100% | 70% | setDeliveryMode, setDeliveryMode, setDeliveryMode, setDeliveryMode, setDeliveryMode | — | — |

## Findings

- **Simple structural edits are a solved problem for Haiku.** Swap, merge, set-required, and the delivery-mode sequence all hit 100% kind recall. Argument accuracy dips to 70% only on `suggest-delivery-modes`, where the model's reasoning about which page is "complex enough" to warrant conversational delivery differs from the scripted answer — that is a judgment call, not a correctness failure.
- **Entity resolution from group names fails.** The `move-military` intent ("Move 'military service' to page 4") produces zero commands. Haiku cannot reliably map the quoted group name back to `military-service`'s id from the spec context. This is the single biggest gap against the larger models.
- **Semantic command-name confusion.** The `rename-personal-info` intent produces a `renameGroup` command instead of `renamePage`. Haiku treats "personal info" as a group label rather than a page title even though the spec labels page-1's title as "Personal Information". This is the pattern Assignment 10 flagged: smaller models are faster but pick the wrong tool when two tools have overlapping names.

## Cost

Bedrock on-demand pricing for Claude Haiku 4.5 (model id `us.anthropic.claude-haiku-4-5-20251001-v1:0`): ~$1.00 per 1M input tokens, ~$5.00 per 1M output tokens. Each scripted intent is a single short tool-calling turn (~2k input tokens, ~200 output tokens); total run cost is under $0.01 for all six intents.
