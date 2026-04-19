---
kind: pdf-field-extraction
implementation: sonnet-hybrid-v1
status: working
course-topics: [evaluation, prompt-optimization, few-shot]
---

# PDF Field Extraction: Claude Sonnet 4 (hybrid prompt)

> Selectable in **Settings → Variants → Extraction**.

## Approach

Replaces the baseline Step-1 prompt with a concise rewrite that front-loads a single exemplar (the `nested-groups` case) and trims the guidelines enumeration to a one-line directive. Runs at `temperature: 0`. Ports the Assignment 10 "hybrid-v2" shape to PDF extraction.

Structure of the prompt:

1. A single short instruction ("Extract the structure… follow the example before producing your own").
2. One inline exemplar: the `nested-groups` employment-history case, input and expected JSON output.
3. The JSON schema block (same as baseline — the model still needs to know the target shape).
4. A single-sentence closing directive: "Return ONLY the JSON. Use kebab-case ids, camelCase fieldNames. Flag fields you're less than 80% confident on. Be thorough."

The single exemplar is reused from `services/extraction/exemplars` — no new content. The hypothesis is that prompt shape matters more than exemplar count for a frontier model.

## Metrics (LLM Judge, Opus scorer)

_Pending evaluation run._

| Metric | Hybrid-v1 | Baseline Sonnet | Few-Shot Sonnet | Delta vs. baseline |
|---|---|---|---|---|
| Field Recall | — | — | — | — |
| Field Precision | — | — | — | — |
| Type Accuracy | — | — | — | — |
| Group Accuracy | — | — | — | — |
| Sensitivity Accuracy | — | — | — | — |

## Findings

_Pending evaluation run._

## Course Connection

Assignment 10 found that a concise "hybrid" prompt (one example + short rules) outperformed a verbose "all-best-practices" prompt on Mistral 3B by ~36pp, and matched the verbose prompt on Tier A models (Haiku, Sonnet) while using fewer tokens. This variant tests the second half of that finding on the PDF extraction task:

- If hybrid-v1 matches or beats the 3-exemplar few-shot variant, the conclusion is that for extraction, prompt *shape* (one concrete anchor example + terse directives) matters more than exemplar count.
- If hybrid-v1 underperforms few-shot, the conclusion is that extraction's breadth (nested groups + sensitivity + conditionals all in one form) benefits from multiple anchor examples that the model can triangulate.

Either result informs the Forms Lab prompt-engineering playbook for this pipeline.

## Cost

Marginally cheaper than few-shot (one exemplar vs three) and slightly more expensive than the baseline (the single exemplar is ~300-400 tokens). Output tokens unchanged.

| Model | Input $/1K | Output $/1K | Est. Cost/Extraction |
|---|---|---|---|
| Sonnet (baseline) | $0.003 | $0.015 | $0.15-0.40 |
| Sonnet (few-shot, 3 exemplars) | $0.003 | $0.015 | $0.16-0.41 |
| Sonnet (hybrid-v1, 1 exemplar) | $0.003 | $0.015 | $0.15-0.40 |
