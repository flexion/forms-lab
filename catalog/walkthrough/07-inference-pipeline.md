---
title: "Inference Pipeline"
order: 7
rubric: [inference-pipeline]
timing: "2 min"
audience: [evaluator]
---

# Inference Pipeline Design

The inference pipeline handles communication between the Forms Lab application and Claude via Amazon Bedrock.

## Extraction Pipeline

```
PDF Upload → PdfExtractor (strategy) → Bedrock API → Parse Response → DataCollectionSpec
```

The pipeline follows a strategy pattern:

- **Interface**: `PdfExtractor` defines the extraction contract
- **Implementation**: `ApiPdfExtractor` calls Claude via Bedrock
- **Configuration**: Model ID, sampling parameters, and system prompt are configurable

## Shaping Pipeline

A second inference path handles LLM-assisted form shaping:

```
Intent → AI SDK tool-use (Claude/Bedrock) → Command batch → Staged buffer → POST /edit/save → Zod + executor validation → Git commit
```

- **Interface**: `FormShaper` — given a spec and a user intent, returns a command batch
- **Implementation**: `BedrockShaper` calls Claude with an array of registered AI SDK tools
- **Staging**: Accepted LLM batches and direct-manipulation edits both stage into one client-side buffer before committing
- **Validation**: Every command is re-validated with its Zod schema server-side before the executor runs
- **Atomicity**: One Save = one commit = the whole buffer applied atomically, or none of it

The two pipelines use the same Bedrock client but different sampling profiles. Extraction uses free-form structured output (the whole spec). Shaping uses tool-use mode, where the LLM can only emit calls matching registered tool schemas — well-formedness is a modeling constraint rather than a parse hope.

See the [LLM tool-use as validation boundary decision](/catalog/decisions/architecture/llm-tool-use-as-validation-boundary) and the [unified staged buffer decision](/catalog/decisions/architecture/unified-staged-buffer).

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

See: [Story #3](/catalog/stories/3-maya-uploads-a-pdf-and-reviews-the-extracted-specs) | [Story #4](/catalog/stories/4-maya-shapes-the-form-experience) | [Extraction Experiments](/catalog/experiments/pdf-field-extraction) | [Shaping Architecture Experiment](/catalog/experiments/shaping-architecture)
