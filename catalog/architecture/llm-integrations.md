---
status: working
tags: [architecture, llm, integrations]
---

# LLM Integrations

This page enumerates every place Forms Lab calls a large language model.
Use it as the map to "find every LLM call site" in the codebase.

Links use the `src:` scheme: they resolve to GitHub permalinks pinned to
the exact commit the running app was built from. Clicking a link opens
the source at the commit currently deployed.

## Extraction

### PDF field extraction (form-documents)

- **Purpose.** Parse an uploaded government form PDF into a structured field list with confidence scores.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/form-documents`](src:src/services/form-documents/index.ts)
- **Invocation site.** [`extraction.ts` `createBedrockPdfExtractor`](src:src/services/form-documents/extraction.ts#L88-L198)
- **Prompt construction.** [`extraction-steps.ts`](src:src/services/form-documents/extraction-steps.ts) and the inline schema prompt in [`extraction.ts`](src:src/services/form-documents/extraction.ts#L117-L176).
- **Related experiment.** [PDF field extraction](../experiments/pdf-field-extraction/)

### Tool-use extraction (form-documents)

- **Purpose.** Same intent as above, but the model emits fields via tool calls instead of JSON-in-text.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/form-documents`](src:src/services/form-documents/index.ts)
- **Invocation site.** [`tool-use-extraction.ts` `createToolUsePdfExtractor`](src:src/services/form-documents/tool-use-extraction.ts#L25-L121)
- **Tool definitions.** [`extraction-tools.ts`](src:src/services/form-documents/extraction-tools.ts)
- **Related experiment.** [PDF field extraction](../experiments/pdf-field-extraction/)

## Shaping

### Form shaping (forms/shaping)

- **Purpose.** Given a `DataCollectionSpec`, propose an edited `FormSpec` matching the owner's shaping intent.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/forms`](src:src/services/forms/index.ts)
- **Invocation site.** [`bedrock-shaper.ts` `createBedrockFormShaper`](src:src/services/forms/shaping/bedrock-shaper.ts#L69-L111)
- **Prompt builder.** Inline `buildPrompt` in [`bedrock-shaper.ts`](src:src/services/forms/shaping/bedrock-shaper.ts#L29-L63).
- **Related experiment.** [Shaping model comparison](../experiments/shaping-model-comparison/)

## Filling

### Conversational form filling (forms/filling-agent)

- **Purpose.** Converse with a filler to collect answers for a `FormSpec`; produce a structured submission.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/forms`](src:src/services/forms/index.ts)
- **Invocation site.** [`bedrock.ts` `BedrockFillingAgent.advance`](src:src/services/forms/filling-agent/bedrock.ts#L47-L181)
- **System prompt builder.** [`system-prompt-builder.ts`](src:src/services/forms/filling-agent/system-prompt-builder.ts)
- **Related story.** [#9 conversational sections (PR #72)](https://github.com/flexion/forms-lab/pull/72)

## Evaluation

### LLM-as-judge (evaluation)

- **Purpose.** Score extraction or shaping outputs against ground-truth fixtures; summarize correctness.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/evaluation`](src:src/services/evaluation/index.ts)
- **Invocation site.** [`judge.ts` `createBedrockFieldJudge`](src:src/services/evaluation/judge.ts#L15-L42)
- **Judge prompt.** [`judge-prompt.ts`](src:src/services/evaluation/judge-prompt.ts)
- **Related experiment.** [PDF field extraction](../experiments/pdf-field-extraction/)

## Future

### Retrieval-augmented generation

Not yet implemented. The existing experiment roadmap tracks the work if
it lands — see [experiments roadmap](../experiments/roadmap).

## Adding a new LLM integration

When you introduce a new LLM call site:

1. Place the invocation inside a service. If it doesn't fit an existing service, propose a new one (see [software architecture](software-architecture.md)).
2. Expose the orchestrating function through the service's `index.ts`.
3. Add an entry on this page with a `src:` link to the invocation site and any relevant experiment cross-link.
