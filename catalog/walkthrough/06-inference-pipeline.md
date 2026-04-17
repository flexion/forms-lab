---
title: "Inference Pipeline"
order: 6
rubric: [inference-pipeline]
timing: "2 min"
audience: [evaluator]
---

# Inference Pipeline Design

The inference pipeline handles communication between the Forms Lab application and Claude via Amazon Bedrock.

## Pipeline Architecture

```
PDF Upload → PdfExtractor (strategy) → Bedrock API → Parse Response → DataCollectionSpec
```

The pipeline follows a strategy pattern:

- **Interface**: `PdfExtractor` defines the extraction contract
- **Implementation**: `ApiPdfExtractor` calls Claude via Bedrock
- **Configuration**: Model ID, sampling parameters, and system prompt are configurable

## Bedrock Integration

- **Service**: Amazon Bedrock (managed LLM inference)
- **Authentication**: EC2 instance role with `bedrock:InvokeModel` permissions
- **Models available**: Claude Opus, Sonnet, Haiku — all accessible through the same endpoint
- **Region**: us-east-1

## Sampling and Parameters

The extraction prompt uses structured output to ensure reliable JSON parsing:

- **Temperature**: Low (precise extraction, not creative generation)
- **Max tokens**: Scaled to form complexity
- **System prompt**: Defines the extraction schema and domain rules

## Error Handling

- Bedrock API errors are caught and surfaced to the user
- Malformed extraction results are validated against the DataCollectionSpec schema
- Extraction confidence is tracked per-field for review

See: [Story #3](/catalog/stories/3-maya-uploads-a-pdf-and-reviews-the-extracted-specs) | [Extraction Experiments](/catalog/experiments/pdf-field-extraction)
