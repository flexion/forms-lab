---
status: working
story: 66
---

# Story #66: Tool-Use Extraction Variant — Implementation Plan

## Goal

Add an extraction variant `tool-use-sonnet` that uses AI SDK tool-use (structured output via tool calls) instead of free-JSON prompting for the extraction step, demonstrating constrained generation.

## Architecture

The current extraction at `src/services/form-documents/extraction.ts` uses free-form JSON: the prompt asks for JSON matching a schema, and `parseJsonResponse` strips markdown fences and parses. This works but can produce malformed JSON that fails parsing.

The tool-use variant will define tools matching the extraction domain (add_group, add_field, set_sensitivity, etc.) and have the model call them instead of producing free JSON. This mirrors the shaping pipeline pattern at `src/services/forms/shaping/tools.ts` + `bedrock-shaper.ts`.

Key constraint: only Step 1 (DataCollectionSpec extraction) uses tool-use. Steps 2 (FormSpec generation) and 3 (field mapping) remain free-JSON since they're simpler and less error-prone.

## Tasks

### 1. Define extraction tools (src/services/form-documents/extraction-tools.ts)

Create a new file with AI SDK `tool()` definitions. Keep the vocabulary small:

```typescript
import { tool } from 'ai'
import { z } from 'zod'

const sensitivity = z.enum(['low', 'medium', 'high', 'pii'])
const fieldType = z.enum(['text', 'email', 'phone', 'url', 'number', 'currency', 'date', 'boolean', 'choice', 'longText'])

export const extractionTools = {
  createSpec: tool({
    description: 'Initialize the extraction with the form ID, title, and description.',
    inputSchema: z.object({
      id: z.string().describe('kebab-case form identifier'),
      title: z.string(),
      description: z.string(),
    }),
  }),
  addGroup: tool({
    description: 'Add a requirement group to the spec.',
    inputSchema: z.object({
      id: z.string().describe('kebab-case group ID'),
      title: z.string(),
      description: z.string().optional(),
    }),
  }),
  addField: tool({
    description: 'Add a field (requirement) to the most recently added group.',
    inputSchema: z.object({
      id: z.string().describe('kebab-case field ID'),
      fieldName: z.string().describe('camelCase field name'),
      label: z.string(),
      fieldType: fieldType,
      required: z.boolean(),
      helpText: z.string().optional(),
      sensitivity: sensitivity.optional(),
    }),
  }),
  flagLowConfidence: tool({
    description: 'Flag a field as low confidence (< 0.8).',
    inputSchema: z.object({
      fieldId: z.string(),
      confidence: z.number().min(0).max(1),
      flags: z.array(z.string()).optional(),
    }),
  }),
}
```

### 2. Create tool-use extractor factory (src/services/form-documents/tool-use-extraction.ts)

New file that builds a `PdfExtractor` using tool calls:

- Send PDF + a prompt that says "Call the provided tools to extract this form's structure. Call createSpec first, then addGroup/addField for each section."
- Call `generateText()` with `tools: extractionTools` and `maxSteps: 1` (single turn, multiple tool calls)
- Reconstruct `DataCollectionSpec` from the tool call sequence:
  - `createSpec` → set spec id/title/description
  - `addGroup` → push new group, track "current group"
  - `addField` → push field to current group
  - `flagLowConfidence` → collect into confidence array
- Validate the reconstructed spec with `dataCollectionSpecSchema` from `src/services/form-documents/schemas.ts`
- Steps 2 and 3 (FormSpec generation, field mapping) reuse the existing free-JSON approach from `createBedrockPdfExtractor` — extract that logic into shared helpers or call the existing function for those steps

### 3. Track validation failure rate

Add a counter to the tool-use extractor:
- Before schema validation, increment `totalExtractions`
- If validation fails, increment `validationFailures`
- Log the rate: `console.log(\`Validation: ${failures}/${total} failures\`)`
- Include the rate in the extraction result metadata (extend `ExtractionResult` type if needed, or just log it — the catalog page will capture the finding)

### 4. Register the tool-use-sonnet variant

In `src/services/extraction/registry.ts`, add after haiku:

```typescript
import { createToolUsePdfExtractor } from '../form-documents/tool-use-extraction'

registry.register({
  id: 'tool-use-sonnet',
  metadata: {
    name: 'Claude Sonnet 4 (tool-use)',
    description: 'Sonnet with structured tool-use instead of free-JSON extraction.',
    status: 'experimental',
    courseTopics: ['evaluation', 'constrained-generation', 'tool-use'],
    catalogPath: '/catalog/experiments/pdf-field-extraction/tool-use-sonnet',
    modelId: SONNET_MODEL_ID,
  },
  create: () => createToolUsePdfExtractor({ model: SONNET_MODEL_ID }),
})
```

### 5. Write tests

Create `test/tool-use-extraction.test.ts`:
- Test that extraction tools are correctly defined (each has inputSchema)
- Test the reconstruction logic: given a sequence of mock tool calls, verify the produced DataCollectionSpec is correct
- Test validation failure tracking

Update `test/extraction-registry.test.ts`:
- Bump strategy count assertion
- Add test for tool-use-sonnet registration

### 6. Create catalog page

Create `catalog/experiments/pdf-field-extraction/tool-use-sonnet.md`:

```markdown
---
kind: pdf-field-extraction
implementation: tool-use-sonnet
status: working
course-topics: [evaluation, constrained-generation, tool-use]
---

# PDF Field Extraction: Claude Sonnet 4 (Tool-Use)

> Selectable in **Settings → Variants → Extraction**.

**Status:** experimental

## Approach

Uses AI SDK tool-use to constrain the model's extraction output. Instead of asking for free-form JSON, the model calls domain tools (createSpec, addGroup, addField, flagLowConfidence) that build the DataCollectionSpec incrementally.

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
```

### 7. Update roadmap and orchestration doc

Same as other stories — flip status to `pr-open`.

## Verification

Run `bun run check` — must be green. Do NOT run evaluation.

## Non-goals

- Do not run evaluation (gated)
- Do not modify existing extraction variants
- Steps 2/3 (FormSpec, field mapping) stay as free-JSON — only Step 1 uses tool-use
