---
kind: pdf-field-extraction
implementation: sonnet-temperature-zero
status: working
course-topics: [evaluation, prompt-optimization, determinism]
---

# PDF Field Extraction: Claude Sonnet 4 (temperature=0)

> Selectable in **Settings → Variants → Extraction**.

## Approach

Identical to baseline Sonnet extraction, with one change: the Step-1 extraction call is issued at `temperature: 0` instead of the provider default. The intent is to ablate the "free optimization" lever discussed in Assignment 10 — deterministic output at zero marginal cost, no prompt changes, no new exemplars.

Steps 2 (FormSpec generation) and 3 (AcroForm mapping) retain provider defaults. The variant measures the extraction prompt specifically; downstream deterministic behavior is not the hypothesis being tested.

## Metrics (LLM Judge, Opus scorer)

_Pending evaluation run._

| Metric | Temperature=0 | Baseline Sonnet | Delta |
|---|---|---|---|
| Field Recall | — | — | — |
| Field Precision | — | — | — |
| Type Accuracy | — | — | — |
| Group Accuracy | — | — | — |
| Sensitivity Accuracy | — | — | — |

## Findings

_Pending evaluation run._

## Course Connection

Assignment 10's first observation was that `temperature=0` is a free win for evaluation-style tasks: no token cost, no prompt-engineering effort, and it makes repeat runs comparable. This variant asks whether the same lever moves the needle on a task (PDF field extraction) where the model is already instruction-following-saturated.

A null result is informative — it would suggest that Sonnet's baseline sampling is already well-calibrated for this task and that the gains on the coursework's multiple-choice-style problems do not transfer to structured extraction. A positive result would imply the baseline variant was leaving accuracy on the table for free.

## Cost

Identical to baseline Sonnet. No additional input or output tokens — only a sampling-parameter change.

| Model | Input $/1K | Output $/1K | Est. Cost/Extraction |
|---|---|---|---|
| Sonnet (baseline) | $0.003 | $0.015 | $0.15-0.40 |
| Sonnet (temperature=0) | $0.003 | $0.015 | $0.15-0.40 |
