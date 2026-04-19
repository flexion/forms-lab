---
kind: pdf-field-extraction
implementation: sonnet-temperature-zero
status: current
course-topics: [evaluation, prompt-optimization, determinism]
---

# PDF Field Extraction: Claude Sonnet 4 (temperature=0)

> Selectable in **Settings → Variants → Extraction**.

## Approach

Identical to baseline Sonnet extraction, with one change: the Step-1 extraction call is issued at `temperature: 0` instead of the provider default. Ablates the "free optimization" lever discussed in Assignment 10 — deterministic output at zero marginal cost, no prompt changes, no new exemplars.

Steps 2 (FormSpec generation) and 3 (AcroForm mapping) retain provider defaults. The variant measures the extraction prompt specifically; downstream deterministic behavior is not the hypothesis being tested.

## Metrics (LLM Judge, Opus scorer)

| Metric | Temperature=0 | Baseline Sonnet | Delta |
|---|---|---|---|
| Field Recall | 52.2% | 62.1% | -9.9pp |
| Field Precision | 94.0% | 78.9% | **+15.1pp** |
| Type Accuracy | 95.6% | 97.0% | -1.4pp |
| Group Accuracy | 28.9% | 31.4% | -2.5pp |
| Sensitivity Accuracy | 35.0% | 27.3% | **+7.7pp** |

## Findings

**Precision jumps dramatically, recall drops.** Temperature=0 makes Sonnet materially more conservative: precision rises from 79% to 94% (+15.1pp, the largest single-variant jump we've measured on this suite) and sensitivity labels improve by +7.7pp, but the model now misses about 1-in-10 additional fields (recall -9.9pp). The trade is almost purely on the "omit rather than guess" axis.

**The recall loss concentrates on dense, highly structured forms.** On the W-9 (small, simple) recall is effectively perfect. On the I-9 (dense, repeated supplement blocks) and the pardon application (140+ fields, deeply nested) the deterministic sampling collapses whole clusters of similar fields — preparer blocks, supplement pages, support-letter triplets — into single representative entries.

**Temperature=0 is not a pure "free optimization" for extraction.** Assignment 10 framed it that way for small tool-calling tasks where the ceiling was near 100% and variance was the only thing holding it back. For structured extraction with a long-tail of fields, temperature=0 moves the operating point rather than lifting the ceiling: better for downstream pipelines that can't tolerate hallucinated fields, worse when completeness matters.

## Course Connection

Assignment 10's first observation was that `temperature=0` is a free win for evaluation-style tasks on small models (Mistral 8B went from 99.2% mean at temp=0.2 to 100% at temp=0.0-0.1 with zero effort). Story #73 tests whether the same lever moves the needle on a frontier model doing structured extraction — a task where the correct answer is a long list, not a single choice.

The finding is **not** a null result — temperature=0 is the largest single-dimension intervention on this suite — but it is **not** free in the Assignment 10 sense. The homework's "free" framing only applies when variance is the bottleneck; here, determinism trades recall for precision rather than eliminating residual failures. That distinction is the story: a prompt-engineering technique that ports cleanly across model scales can still port a different effect.

## Cost

Identical to baseline Sonnet. No additional input or output tokens — only a sampling-parameter change.

| Model | Input $/1K | Output $/1K | Est. Cost/Extraction |
|---|---|---|---|
| Sonnet (baseline) | $0.003 | $0.015 | $0.15-0.40 |
| Sonnet (temperature=0) | $0.003 | $0.015 | $0.15-0.40 |

## Per-fixture details

Missed-and-extra field lists preserved in `sonnet-temperature-zero.json` for provenance.
