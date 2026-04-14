---
title: "Evaluation & Experimentation"
order: 4
rubric: [model-functionality]
timing: "3 min"
audience: [evaluator]
---

# Systematic Model Evaluation

Evaluation is not an afterthought — it is built into the development workflow.

## Evaluation Framework

Every extraction is scored against a manually-created ground truth using quantitative metrics:

| Metric | What It Measures |
|---|---|
| Field Recall | Did we find all the fields? |
| Field Precision | Did we only find real fields (no hallucinations)? |
| Type Accuracy | Did we assign correct types (text, number, date, etc.)? |
| Group Accuracy | Did we group related fields correctly? |
| Sensitivity Accuracy | Did we classify PII correctly? |

## Model Comparison

The evaluation harness runs the same test suite across different models:

| Model | Field Recall | Field Precision | Type Accuracy |
|---|---|---|---|
| Opus (baseline) | 100% | 100% | 100% |
| Sonnet | Evaluated | Evaluated | Evaluated |
| Haiku | Evaluated | Evaluated | Evaluated |

## Scoring Methods

Two complementary approaches:

1. **Deterministic scoring** — Exact fieldName + normalized label match. Fast, reproducible, but undercounts synonyms and naming variations.
2. **LLM-as-Judge** — Uses a separate LLM call to semantically match extracted fields against ground truth. Handles synonyms, prefixes, and structural variations.

The LLM-as-Judge approach itself is a significant LLM integration point — using one model to evaluate another model's output.

See: [Experiment Suite](/catalog/experiments/pdf-field-extraction) | [Evaluation Decisions](/catalog/decisions)
