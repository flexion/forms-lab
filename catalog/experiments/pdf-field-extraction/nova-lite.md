---
kind: pdf-field-extraction
implementation: nova-lite
status: current
course-topics: [evaluation, model-selection, cost-optimization, capability-boundaries]
---

# PDF Field Extraction: Amazon Nova Lite

> Selectable in **Settings → Variants → Extraction**.

## Approach

Uses the same free-JSON extraction prompt as baseline Sonnet, but with Amazon's Nova Lite multimodal model via AWS Bedrock. Nova Lite supports native PDF input and costs roughly **1/50th** the price of Sonnet, and about **1/13th** the price of Nova Pro — the cheapest multimodal option on the shelf.

## Scope

**Smoke eval only** — one fixture (W-9, 16 ground-truth fields), one run, no full suite sweep. The point of this variant is breadth: does a small, non-Anthropic multimodal model clear the "section vs field" bar that Nova Pro fell through? Full-suite evaluation is deferred.

## Metrics (Deterministic scorer, W-9 smoke run)

| Metric | Nova Lite | Nova Pro (W-9) | Baseline Sonnet (suite) | Delta vs Nova Pro (W-9) |
|---|---|---|---|---|
| Field Recall | 56.3% | 0.0% | 62.1% | +56.3pp |
| Field Precision | 64.3% | 0.0% | 78.9% | +64.3pp |
| Type Accuracy | 100.0% | 100.0%* | 97.0% | — |
| Group Accuracy | 44.4% | 100.0%* | 31.4% | -55.6pp |
| Sensitivity Accuracy | 44.4% | 100.0%* | 27.3% | -55.6pp |

_\* Nova Pro's 100%s on W-9 are vacuous — zero fields matched, so the accuracy denominators are also zero and the scorer returns 1. Nova Lite's 100% on Type is over 9 matched fields, which is meaningful._

Raw run: [`nova-lite.json`](./nova-lite.json). Totals: 16 ground-truth fields, 14 extracted, **9 matched**, 7 missed, 5 extra.

## Findings

**Nova Lite outperforms Nova Pro at field-level extraction on the W-9 smoke test.** Nova Lite matched 9 of 16 ground-truth fields on W-9; Nova Pro matched 0 of 16 on the same fixture. This is the opposite of what the pricing and "Lite < Pro" naming would predict. Two plausible explanations:

1. **Newer training mix.** Nova Lite and Nova Pro were released together, but Lite may have a more recent instruction-tuning pass that happens to align better with "decompose this PDF into granular fields" prompts.
2. **Prompt-length sensitivity.** The baseline free-JSON prompt is ~1k tokens of dense schema. Smaller models sometimes follow dense schemas more literally than larger models, which drift into summarisation. This is consistent with the coursework finding that prompt-shape effects grow as models shrink.

Either way, this is a single-fixture result. The extracted fields were mostly correct (64% precision on a 16-field form), but the group and sensitivity labels wandered — only 44% of matched fields landed in the right group or got the right sensitivity label.

**This does not make Nova Lite production-viable for extraction.** A 56% recall on the simplest fixture (W-9) is far below the 73% recall the Sonnet hybrid variant achieves on the full three-fixture suite. Scaling up to the I-9 (128 fields) and pardon application (181 fields) is almost certainly where Nova Lite will fall apart, matching the Nova Pro collapse documented in [nova-pro.md](./nova-pro.md). But for taxonomic breadth — "did we test a model cheaper than Haiku?" — Nova Lite is the honest point on the cost frontier.

## Cost Comparison

| Model | Input $/1K | Output $/1K | W-9 Recall | Viable for Extraction? |
|---|---|---|---|---|
| **Nova Lite** | $0.00006 | $0.00024 | 56.3% | No (single-fixture smoke) |
| Nova Pro | $0.0008 | $0.0032 | 0.0% | No |
| Haiku 4.5 | $0.0008 | $0.004 | ~45% (suite) | Marginal |
| Sonnet 4 | $0.003 | $0.015 | 62.1% (suite) | Yes |
| Sonnet hybrid | $0.003 | $0.015 | 73% (suite) | Yes (production) |

Nova Lite is **50x cheaper on input tokens than Sonnet** and **12x cheaper than Nova Pro**. If somehow this recall held up on larger forms, it would be a compelling cost leader. It almost certainly will not — but we would need a full-suite run to confirm, and the point today is breadth, not a new production candidate.

## Course Connection

This result maps to **Chapter 6: model selection** and the Assignment 10 "Pareto frontier" framing: pricing tier and capability are correlated but not identical, and surprises go both ways. Nova Lite beating Nova Pro on the exact same prompt is a small but real counter-example to "cheaper means worse". That is worth registering in the variant list so future experiments can probe it properly.

For the presentation, this joins Nova Pro and Llama 3.2 Vision as a documented **capability-boundary probe**: non-Anthropic multimodal models tested on the same extraction task, honest numbers recorded, and no cherry-picking of the winner.

## Limitations

- Smoke eval only (W-9, 1 fixture, 1 run).
- Cached result: re-runs return the same extraction unless `data/cache.sqlite` is cleared.
- No prompt tuning applied — the variant uses the default prompt exactly as Nova Pro did. A Nova-tailored prompt might move the numbers, but that was out of scope for today.
- FlexionLLM Bedrock account used; llm-class account should produce identical results (same on-demand model, same region).
