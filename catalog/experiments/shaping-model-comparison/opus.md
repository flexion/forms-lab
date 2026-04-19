---
kind: shaping-commands
implementation: opus
status: current
course-topics: [evaluation, model-selection]
---

# Form Shaping: Claude Opus 4.6

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

Uses `createBedrockFormShaper({ model: OPUS_MODEL_ID })` with the standard 25-command tool-use prompt. Opus is the frontier model, expected to deliver the highest quality at higher cost and latency.

## Expectations

Opus should excel at multi-step intents and nuanced entity resolution. The "suggest delivery modes based on complexity" intent is designed to differentiate Opus from smaller models, as it requires reasoning about page content to choose appropriate modes.

## Findings

Awaiting evaluation run.
