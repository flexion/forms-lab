---
kind: pdf-field-extraction
implementation: nova-pro
status: current
course-topics: [evaluation, model-selection, cost-optimization]
---

# PDF Field Extraction: Amazon Nova Pro

> Selectable in **Settings → Variants → Extraction**.

## Approach

Uses the same free-JSON extraction prompt as baseline Sonnet, but with Amazon's Nova Pro multimodal model via AWS Bedrock. Nova Pro supports native PDF input and costs roughly 1/4 the price of Sonnet.

## Metrics (Deterministic scorer)

| Metric | Nova Pro | Baseline Sonnet | Delta |
|---|---|---|---|
| Field Recall | 0.6% | 62.1% | -61.5pp |
| Field Precision | 4.0% | 78.9% | -74.9pp |
| Type Accuracy | 100.0% | 97.0% | +3.0pp |
| Group Accuracy | 50.0% | 31.4% | +18.6pp |
| Sensitivity Accuracy | 100.0% | 27.3% | +72.7pp |

## Findings

**Nova Pro fails at field-level extraction.** Despite achieving 97-100% on the homework's tool-calling interview task, Nova Pro cannot perform PDF field extraction at a useful level. It produces section-level summaries (e.g., "contactInformation", "familyInformation") rather than individual fields (e.g., "firstName", "lastName", "emailAddress").

**The task complexity gap is larger than expected.** The homework tested Nova Pro on a 10-field interview spec where it scored 97%. PDF extraction requires identifying 30-140 individual fields from visual document layout — a fundamentally different and harder task than following a pre-defined field list. This confirms the homework's 15-field ceiling applies even more strongly to open-ended extraction (vs. tool-calling with a known schema).

**The 100% type/sensitivity/group scores are vacuously true.** With only 1 matched field across all fixtures, the accuracy metrics are meaningless — they represent 1/1 = 100% on a single data point.

**Prompt optimization likely won't fix this.** The homework showed that prompt strategy helps small models follow instructions (hybrid prompt: 89% → 100% on Mistral 8B). But Nova Pro's failure mode isn't instruction-following — it's a capability gap in document understanding. The model can read the PDF but cannot decompose it into granular fields.

## Cost Comparison

| Model | Input $/1K | Output $/1K | Field Recall | Viable? |
|---|---|---|---|---|
| Nova Pro | $0.0008 | $0.0032 | 0.6% | No |
| Haiku 4.5 | $0.0008 | $0.004 | ~45% | Marginal |
| Sonnet 4 | $0.003 | $0.015 | 62.1% | Yes |
| Opus 4.6 | $0.015 | $0.075 | ~72% | Yes (best) |

**Conclusion:** For PDF field extraction, Claude models remain necessary. The cost floor is Haiku at $0.0008/1K input tokens. Non-Claude models that work well for simpler tasks (tool-calling, classification) do not transfer to complex document understanding.

## Course Connection

This result directly validates Assignment 10's key finding: **model selection dominates prompt engineering.** The homework's cost-performance frontier ($0.003/interview at 100% for Llama 4 Scout) applies specifically to tasks within the model's capability range. PDF extraction is outside that range for all tested non-Claude models.

The implication for production: cost optimization for extraction should focus on Haiku (cheapest Claude) or prompt techniques that improve Sonnet's recall (few-shot, prompt-opt), rather than switching to non-Claude models.
