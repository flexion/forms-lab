---
kind: pdf-field-extraction
implementation: few-shot-sonnet
status: current
course-topics: [evaluation, few-shot, prompt-conditioning]
---

# PDF Field Extraction: Claude Sonnet 4 (Few-Shot)

> Selectable in **Settings → Variants → Extraction**.

## Approach

Prepends 2-3 curated exemplar pairs (input description → output spec) to the standard extraction prompt. Each exemplar targets an edge case the base prompt struggles with:

1. **Nested groups** — teaches hierarchical grouping (employment with current/previous sub-sections)
2. **Sensitivity labels** — teaches correct PII classification (SSN → pii, DOB → high, name → medium)
3. **Conditional fields** — teaches condition objects for fields gated on prior answers

Exemplars are compact (~400 tokens each) to stay within budget. Total prompt overhead: ~1,200 tokens.

## Metrics (LLM Judge, Opus scorer)

| Metric | Few-Shot | Baseline Sonnet | Delta |
|---|---|---|---|
| Field Recall | 55.3% | 62.1% | -6.8pp |
| Field Precision | 86.5% | 78.9% | **+7.6pp** |
| Type Accuracy | 96.3% | 97.0% | -0.7pp |
| Group Accuracy | 36.7% | 31.4% | **+5.3pp** |
| Sensitivity Accuracy | 21.3% | 27.3% | -6.0pp |

## Findings

**Precision improved at the cost of recall.** The exemplars teach the model to be more selective — it emits fewer spurious fields (precision up 7.6pp) but also fewer total fields (recall down 6.8pp). Group accuracy improved 5.3pp, suggesting the nested-groups exemplar works.

**Sensitivity exemplar underperformed.** Despite a dedicated exemplar, sensitivity accuracy dropped slightly. The model may be over-indexing on the exemplar's specific sensitivity patterns rather than generalizing the classification rules.

**Trade-off profile:** Few-shot is best when you need high-confidence fields and can tolerate gaps. For forms where completeness matters more than correctness of individual fields, the baseline Sonnet remains preferred.

## Course Connection

Assignment 10 showed that few-shot examples beat verbose instructions for small models (Mistral 3B: 99% with examples vs 63% with instructions alone). However, for a large model like Sonnet that already follows instructions well, adding examples may constrain rather than assist — consistent with the homework finding that Tier A models (Haiku, Sonnet) need no prompting help to achieve their ceiling.

The strategy inversion documented in the homework applies here: the same technique that dramatically helps an 8B model can slightly hurt a frontier model by anchoring its output patterns too narrowly.

## Cost

Same model (Sonnet) with ~1,200 additional input tokens per extraction. Marginal cost increase: ~$0.0036/extraction. Negligible relative to the base extraction cost of ~$0.15-0.40 depending on form size.

| Model | Input $/1K | Output $/1K | Est. Cost/Extraction |
|---|---|---|---|
| Sonnet (baseline) | $0.003 | $0.015 | $0.15-0.40 |
| Sonnet (few-shot) | $0.003 | $0.015 | $0.16-0.41 |
