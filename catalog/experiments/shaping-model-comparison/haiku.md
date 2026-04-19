---
kind: shaping-commands
implementation: haiku
status: current
course-topics: [evaluation, model-selection]
---

# Form Shaping: Claude Haiku 4.5

> Selectable in **Settings → Variants → Shaping**.

**Status:** experimental

## Summary

| Metric | Value |
|---|---|
| Command-Kind Recall | -- |
| Command-Kind Precision | -- |
| Argument Accuracy | -- |

Metrics will be populated after the first evaluation run against the scripted intent suite.

## Approach

Uses `createBedrockFormShaper({ model: HAIKU_MODEL_ID })` with the standard 25-command tool-use prompt. Haiku is the fastest and cheapest model in the comparison.

## Expectations

Haiku should handle single-command intents (swap, rename) adequately but may struggle with nuanced requests that require identifying the right entity from context (e.g., "the middle-name field") or multi-step reasoning (e.g., "suggest delivery modes based on complexity").

## Findings

Awaiting evaluation run.
