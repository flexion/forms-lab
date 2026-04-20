---
kind: pdf-field-extraction
status: working
---

# PDF Field Extraction Evaluation

Measures how completely and accurately extraction strategies identify form fields from government PDF forms.

## Summary of findings

**[`sonnet-hybrid-v1`](./sonnet-hybrid-v1) is the production default.** One short instruction, one inline exemplar, temperature=0. It **Pareto-dominates every other prompt-only variant on this suite**: precision 99.2%, recall 72.6%, sensitivity accuracy 51.1% — wins four of five metrics outright and ties on the fifth, at the same cost as baseline Sonnet (and cheaper than 3-exemplar few-shot). This is the same prompt shape that topped the Assignment 10 tool-calling leaderboard on Mistral 8B; the rank ordering reproduces across model scale and task type.

**Structural constraints are the largest sensitivity lever.** [`tool-use-sonnet`](./tool-use-sonnet) forces the model to call typed tools instead of emitting free JSON. Sensitivity accuracy jumps from 27% to 79% (+51pp) and precision reaches 96.3%, at the cost of recall (step-limited at 20 rounds). For forms that fit inside the step budget, tool-use is the safest variant.

**Capability gaps don't close with prompting.** [`nova-pro`](./nova-pro) scored 97% on the homework's 10-field tool-calling task but achieves 0.6% recall here — it summarizes sections instead of enumerating fields. PDF field extraction sits outside Nova Pro's capability range; prompt engineering cannot recover this. Model selection dominates prompt engineering once you're past the capability boundary.

See the roadmap at [`/catalog/experiments`](/catalog/experiments) for how these findings connect to the other suites.

## Metrics

| Metric | Description |
|---|---|
| Field Recall | Percentage of ground truth fields found in extraction output |
| Field Precision | Percentage of extracted fields that exist in ground truth |
| Type Accuracy | Percentage of matched fields with correct field type |
| Group Accuracy | Percentage of matched fields assigned to correct group |
| Sensitivity Accuracy | Percentage of matched fields with correct sensitivity label |

## Test Suite

- **Pardon Application** -- 24-page U.S. Department of Justice petition for presidential pardon
- **USCIS Form I-9** -- Employment eligibility verification. 4 sections covering employee, employer, preparer/translator supplement, and reverification supplement (128 fields)
- **IRS Form W-9** -- Request for taxpayer identification. 8 sections covering entity, tax classification, exemptions, address, certification (16 fields)

## Ground Truth

Generated using Claude Opus 4.6 as reference oracle. Ground truth specs are reviewed for obvious errors before use.

## Scoring Methods

### LLM Judge (primary)

Uses Claude Opus 4.6 to semantically match extracted fields against ground truth. Handles naming variations (synonyms, prefixes, word order) that deterministic matching misses. Each match includes a confidence score and reasoning.

### Deterministic (baseline)

Exact fieldName match + normalized label match. Fast and reproducible but systematically undercounts performance when models use different naming conventions than ground truth. Haiku recall jumps from 61% to 74% when switching from deterministic to LLM judge scoring -- the delta itself demonstrates why evaluation methodology matters.

## Available via the picker

Each variant listed above is user-selectable per account at
[/settings/variants?task=extraction](/settings/variants?task=extraction). The
selected variant runs on every new extraction; provenance is recorded in the
project repo at `forms/default/provenance.json`.

## Capability-boundary probes (non-Anthropic models)

Three variants are registered specifically as capability-boundary probes — they are not production candidates, they exist to document how non-Anthropic multimodal models perform on the same extraction task:

- **[Nova Pro](./nova-pro.md)** — Amazon multimodal, full-suite eval. 0.6% field recall. Fails at decomposing forms into granular fields.
- **[Nova Lite](./nova-lite.md)** — Amazon multimodal, cheapest tier. Smoke-eval on W-9 only: 56% recall, 64% precision over 9 matched fields. Surprisingly outperforms Nova Pro on the same fixture, but group/sensitivity labels drift (44% each). Full-suite run deferred.
- **[Llama 3.2 90B Vision](./llama-3-2-vision.md)** — Meta multimodal via Bedrock. Registered but invocation returns `ResourceNotFoundException` — model is marked Legacy and FlexionLLM account access is gated. Included in the registry so the infrastructure constraint is documented alongside the capability results.

Collectively these three variants document the claim: **non-Anthropic small multimodal models on Bedrock do not yet match Anthropic for government-form extraction**, and model-catalog access is itself a real operational constraint.

## Course Topics

- Evaluation and benchmarking (Chapter 3)
- Model selection (Chapter 6)
- LLM-as-judge evaluation methodology
- Capability boundaries and cost optimization
