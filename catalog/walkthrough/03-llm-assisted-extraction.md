---
title: "LLM-Assisted Extraction"
order: 3
rubric: [model-functionality, innovation]
timing: "3 min"
audience: [evaluator, general]
---

# From PDF to Structured Data

The core LLM integration: given a government PDF form, extract a complete DataCollectionSpec — fields, types, grouping, conditions, and sensitivity classifications.

## How It Works

1. **Upload**: Maya (form creator persona) uploads a PDF form
2. **Extract**: The system sends the PDF to Claude via Amazon Bedrock
3. **Structure**: Claude returns a structured DataCollectionSpec with fields, types, groups, conditions
4. **Review**: Maya reviews the extracted spec in the catalog browser

## The Prompt

The extraction prompt asks Claude to identify:

- **Fields**: Name, label, type (text, number, date, boolean, select), help text
- **Groups**: Logical grouping of related fields (e.g., "Personal Information")
- **Conditions**: When a field should appear based on other field values
- **Sensitivity**: PII classification (name, SSN, address, etc.)

## Strategy Pattern

The extractor uses a strategy pattern (`PdfExtractor` interface) so implementations can be swapped for experimentation:

- `ApiPdfExtractor` — Current implementation using Claude via Bedrock
- Future: alternative models, different prompting strategies, chunking approaches

## Test Form

The primary evaluation form is a 24-page DOJ Pardon Application — a complex, real-world government form with conditional logic, multiple sections, and various field types.

See: [Experiments](/catalog/experiments) | [Story #3](/catalog/stories/3-maya-uploads-a-pdf-and-reviews-the-extracted-specs)
