---
status: working
story: 73
---

# Story #73: Prompt Optimization — Design

Apply two proven techniques from Assignment 10 to the extraction pipeline and measure them against baseline Sonnet:

1. **Temperature = 0** — the "free optimization" from A10. Dropping from the SDK default to 0 eliminated residual variance at zero cost.
2. **Hybrid prompt** — concise instructions + **one** complete exemplar. A10's hybrid-v2 beat 3-exemplar few-shot and verbose TextGrad prompts on Mistral 8B.

## Why two variants, not one

Temperature and prompt shape are independent levers. Isolating them gives the presentation a cleaner narrative:

- Does temperature alone move Sonnet's numbers? (Hypothesis: marginal. Sonnet is already well-calibrated.)
- Does a single-exemplar hybrid beat the 3-exemplar few-shot we already shipped? (Hypothesis: comparable precision, better recall — the 3-exemplar variant over-anchors.)

Both variants use temperature=0 so the "hybrid" result is end-to-end optimized; the "temperature-zero" variant is the controlled ablation.

## Relationship to existing variants

- `extraction/sonnet` (production) — no exemplars, no temperature tuning.
- `extraction/few-shot-sonnet` (shipped) — 3 exemplars, no temperature tuning.
- `extraction/sonnet-temperature-zero` (new) — no exemplars, temperature=0. Ablation.
- `extraction/sonnet-hybrid-v1` (new) — 1 exemplar (nested-groups, the highest-signal one from #63) + temperature=0.

## Course connection (presentation angle)

The rubric wants evidence of iterative prompt engineering. This story gives the strongest possible version:
- A10 showed hybrid > few-shot > verbose TextGrad on small models.
- #73 asks: does the same ordering hold on a frontier model? Tool-use (#66) already showed constrained output beats free JSON; if hybrid also beats 3-shot few-shot on Sonnet, the presentation has a consistent "less is more" story across model sizes.

See plan.md for implementation.
