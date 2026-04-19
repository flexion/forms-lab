---
kind: shaping-commands
implementation: bedrock-sonnet
status: current
course-topics: [evaluation, model-selection]
---

# Form Shaping: Claude Sonnet 4

> Selectable in **Settings → Variants → Shaping**.

**Status:** baseline

## Summary

| Metric | Value |
|---|---|
| Command-Kind Recall | 66.7% |
| Command-Kind Precision | 75.0% |
| Argument Accuracy | 61.7% |

_Run timestamp: 2026-04-19T15:36:59.686Z. Spec version: 2026-04-19._

## Approach

Uses `createBedrockFormShaper({ model: SONNET_MODEL_ID })` with the standard 25-command tool-use prompt. Sonnet is the current default for interactive shaping due to its balance of quality and latency. Each scripted intent is evaluated against expected `Command[]` output via the `shaping-commands` kind (deterministic: kind precision/recall + argument accuracy, no LLM judge).

## Per-intent Results

| Intent | Recall | Precision | Arg Acc | Matched | Missing | Extra |
|---|---|---|---|---|---|---|
| swap-pages | 100% | 100% | 100% | swapPages | — | — |
| merge-employment | 100% | 50% | 100% | mergePages | — | renamePage |
| optional-middle-name | 100% | 100% | 100% | setRequired | — | — |
| move-military | 0% | 100% | 0% | — | moveGroup | — |
| rename-personal-info | 0% | 0% | 0% | — | renamePage | renameGroup |
| suggest-delivery-modes | 100% | 100% | 70% | setDeliveryMode, setDeliveryMode, setDeliveryMode, setDeliveryMode, setDeliveryMode | — | — |

## Findings

- **Same recall as Haiku, lower precision.** Sonnet matches Haiku's 66.7% recall but drops to 75% precision because on `merge-employment` it adds an extra `renamePage` command ("merge these and rename the combined page") — a plausible interpretation of "combine", but not what the scripted intent asked for. Sonnet is optimizing for the user's likely next ask; the scorer rewards exact matches.
- **Same two failure modes as Haiku.** `move-military` (entity resolution from quoted group name) produces zero commands; `rename-personal-info` produces `renameGroup` instead of `renamePage`. The tool-name overlap between `renamePage` and `renameGroup` is a prompt-engineering gap, not a model-capability gap — both Haiku and Sonnet pick the group-focused variant when the user says "personal info".
- **Delivery-mode reasoning is identical to Haiku.** Both models produce the same 3-of-5 static / 1 conversational / 1 static sequence. The scripted answer has 1 conversational page (the military section); both models agree. Argument accuracy of 70% means one page's mode differs from the scripted ground truth — a reasoning-taste difference, not a correctness failure.

## Cost

Bedrock on-demand pricing for Claude Sonnet 4 (model id `us.anthropic.claude-sonnet-4-20250514-v1:0`): ~$3.00 per 1M input tokens, ~$15.00 per 1M output tokens. Each scripted intent is a single short tool-calling turn (~2k input tokens, ~200 output tokens); total run cost is ~$0.04 for all six intents.
