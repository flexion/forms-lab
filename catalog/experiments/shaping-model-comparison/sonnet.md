---
kind: shaping-commands
implementation: sonnet
status: current
course-topics: [evaluation, model-selection]
---

# Form Shaping: Claude Sonnet 4

> Selectable in **Settings → Variants → Shaping**.

**Status:** baseline

## Summary

| Metric | Value |
|---|---|
| Command-Kind Recall | -- |
| Command-Kind Precision | -- |
| Argument Accuracy | -- |

Metrics will be populated after the first evaluation run against the scripted intent suite.

## Approach

Uses `createBedrockFormShaper({ model: SONNET_MODEL_ID })` with the standard 25-command tool-use prompt. Sonnet is the current default for interactive shaping due to its balance of quality and latency.

## Expectations

As the mid-tier model, Sonnet should handle straightforward intents (swap, rename, set-required) reliably. Multi-step intents like "suggest delivery modes" may show partial recall if the model omits some pages.

## Findings

Awaiting evaluation run.
