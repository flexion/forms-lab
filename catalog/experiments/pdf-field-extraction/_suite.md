---
kind: pdf-field-extraction
status: working
---

# PDF Field Extraction Evaluation

Measures how completely and accurately extraction strategies identify form fields from government PDF forms.

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

## Course Topics

- Evaluation and benchmarking (Chapter 3)
- Model selection (Chapter 6)
- LLM-as-judge evaluation methodology
