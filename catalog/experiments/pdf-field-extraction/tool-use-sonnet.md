---
kind: pdf-field-extraction
implementation: tool-use-sonnet
status: working
course-topics: [evaluation, constrained-generation, tool-use]
---

# PDF Field Extraction: Claude Sonnet 4 (Tool-Use)

> Selectable in **Settings -> Variants -> Extraction**.

**Status:** experimental

## Approach

Uses AI SDK tool-use to constrain the model's extraction output. Instead of asking for free-form JSON, the model calls domain tools (createSpec, addGroup, addField, flagLowConfidence) that build the DataCollectionSpec incrementally.

This approach eliminates JSON parsing failures by construction: the model's output is constrained to valid tool calls with schema-validated arguments at generation time. Each tool call is individually validated against its Zod schema, so malformed output is structurally impossible.

Steps 2 (FormSpec generation) and 3 (AcroForm field mapping) continue to use free-JSON prompting since they are simpler and less error-prone.

## Tool Vocabulary

| Tool | Purpose |
|---|---|
| createSpec | Initialize form ID, title, description |
| addGroup | Add a requirement group |
| addField | Add a field to the current group |
| flagLowConfidence | Flag uncertain fields |

## Course Topics

- Constrained generation (Ch 7)
- Tool-use patterns
- Evaluation

## Metrics

_Pending evaluation run._

## Findings

_To be filled after evaluation._
