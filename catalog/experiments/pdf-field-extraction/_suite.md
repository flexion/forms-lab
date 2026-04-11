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

## Ground Truth

Generated using Claude Opus 4.6 as reference oracle. Ground truth specs are reviewed for obvious errors before use.

## Course Topics

- Evaluation and benchmarking (Chapter 3)
- Model selection (Chapter 6)
