---
kind: pdf-field-extraction
implementation: few-shot-sonnet
status: working
course-topics: [evaluation, few-shot, prompt-conditioning]
---

# PDF Field Extraction: Claude Sonnet 4 (Few-Shot)

> Selectable in **Settings -> Variants -> Extraction**.

**Status:** experimental

## Approach

Prepends three curated exemplar (input description -> output spec) pairs to the standard extraction prompt. The exemplars are injected between the JSON schema and the guidelines section, so the model sees concrete examples of correct output before processing the actual PDF.

This is a classic few-shot prompt conditioning technique (Ch 8). The hypothesis is that showing the model what good output looks like for edge cases will improve its handling of those patterns in real forms, without any fine-tuning or additional infrastructure.

## Exemplars

1. **Nested groups** -- Employment history with current and previous sub-sections. Teaches the model to preserve hierarchical grouping rather than flattening related sections into one group.

2. **Sensitivity labels** -- Personal information section with PII fields (SSN, DOB, alien number). Teaches the model to assign correct sensitivity levels: SSN and alien number are `pii`, date of birth is `high`, name is `medium`, general fields are `low`.

3. **Conditional fields** -- Citizenship section where document fields depend on the selected status. Teaches the model to emit `condition` objects when fields are only relevant based on a prior answer.

Each exemplar is kept compact (under 500 tokens) to avoid blowing the context window budget while still providing a clear pattern.

## Course Topics

- **Few-shot prompt conditioning (Ch 8)** -- Using in-context examples to steer model behavior without parameter updates
- **Evaluation and model selection** -- Comparing prompt variants on the same fixtures with deterministic and LLM-judge scorers

## Metrics

_Pending evaluation run._

## Findings

_To be filled after evaluation._
