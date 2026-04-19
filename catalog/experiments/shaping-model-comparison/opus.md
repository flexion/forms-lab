---
kind: shaping-commands
implementation: bedrock-opus
status: current
course-topics: [evaluation, model-selection]
---

# Form Shaping: Claude Opus 4.6

> Selectable in **Settings → Variants → Shaping**.

**Status:** experimental

## Summary

| Metric | Value |
|---|---|
| Command-Kind Recall | 73.3% |
| Command-Kind Precision | 83.3% |
| Argument Accuracy | 66.7% |

_Run timestamp: 2026-04-19T15:37:22.121Z. Spec version: 2026-04-19._

## Approach

Uses `createBedrockFormShaper({ model: OPUS_MODEL_ID })` with the standard 25-command tool-use prompt. Opus is the frontier model, expected to deliver the highest quality at higher cost and latency. Each scripted intent is evaluated against expected `Command[]` output via the `shaping-commands` kind (deterministic: kind precision/recall + argument accuracy, no LLM judge).

## Per-intent Results

| Intent | Recall | Precision | Arg Acc | Matched | Missing | Extra |
|---|---|---|---|---|---|---|
| swap-pages | 100% | 100% | 100% | swapPages | — | — |
| merge-employment | 100% | 50% | 100% | mergePages | — | renamePage |
| optional-middle-name | 100% | 100% | 100% | setRequired | — | — |
| move-military | 0% | 100% | 0% | — | moveGroup | — |
| rename-personal-info | 100% | 50% | 100% | renamePage | — | renameGroup |
| suggest-delivery-modes | 40% | 100% | 0% | setDeliveryMode, setDeliveryMode | setDeliveryMode, setDeliveryMode, setDeliveryMode | — |

## Findings

- **Best-in-suite on entity resolution, edge case on multi-step.** Opus is the only model that correctly maps "personal info" to `renamePage` and produces a `renamePage` command for the scripted rename intent — though with extra (`renameGroup` also emitted, hence 50% precision on that case). The move-military intent still fails across all three models, suggesting the failure lives in the prompt's handling of quoted group names rather than in any single model's capability.
- **Delivery-mode recall regresses vs Sonnet/Haiku.** On `suggest-delivery-modes`, Opus only produces 2 of the 5 expected `setDeliveryMode` commands. The model appears to take "suggest delivery modes" more literally as "pick the ones that need suggestion" — an interpretation error, not a capability gap. Sonnet and Haiku both over-apply `setDeliveryMode` to all 5 pages and accidentally line up with the scripted ground truth.
- **Highest overall quality, at ~2x the latency.** Opus run took 19.8s vs Sonnet 15.9s vs Haiku 10.8s. For interactive shaping UX, this is the Haiku-vs-Sonnet tradeoff from Assignment 10 all over again: the simplest intents are handled equivalently by the cheapest model; only the rare multi-step or entity-resolution cases need the frontier model, and even then the scorer rewards Sonnet for emitting more commands.

## Cost

Bedrock on-demand pricing for Claude Opus 4.6 (model id `us.anthropic.claude-opus-4-6-v1`): ~$15.00 per 1M input tokens, ~$75.00 per 1M output tokens. Each scripted intent is a single short tool-calling turn (~2k input tokens, ~200 output tokens); total run cost is ~$0.20 for all six intents.
