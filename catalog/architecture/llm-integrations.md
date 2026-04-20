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

### Retrieval-augmented generation (RAG)

The RAG service (`src/services/rag/`) provides in-memory vector retrieval over policy corpus documents. Used by both extraction (to ground field generation in regulatory text) and the authoring pipeline (to drive criteria analysis and field generation from corpus alone).

**Components:**
- **Corpus loader** ([`corpus.ts`](src:src/services/rag/corpus.ts)) — Reads `catalog/references/*.md` files with YAML frontmatter + `## Section — <citation>` headings. Also supports project-scoped `references/` via `projectDir` option.
- **Retriever** ([`retrieval.ts`](src:src/services/rag/retrieval.ts)) — In-memory cosine similarity over L2-normalized embeddings. O(n·d) per query; fast for ≤50 chunks.
- **Embedder** — AWS Bedrock Titan Embed V2 (production) or deterministic hash fallback (offline/testing).
- **Policy corpus** — 13 sections from 7 CFR 273 (SNAP Wisconsin) at `catalog/references/snap-wisconsin.md`.

**Integration points:**
- `src/services/extraction/` — RAG-grounded extraction variants prepend policy context to prompts.
- `src/services/form-authoring/` — Full pipeline reads corpus for criteria, structure, and field generation.

**Variant settings:** Three independent tasks in the variant system:
- Authoring: Criteria Analysis (Sonnet/Haiku/Opus)
- Authoring: Structure Generation (Sonnet/Haiku/Opus)
- Authoring: Field Generation (Sonnet/Haiku/Opus)

**Related experiments:** [Authoring pipeline](../experiments/authoring-pipeline/), [RAG extraction](../experiments/pdf-field-extraction/sonnet-with-rag.md)

### Form authoring pipeline

The authoring pipeline (`src/services/form-authoring/`) generates complete form specifications from a policy corpus without a source PDF. Runs as a server-side background task with client polling for progress.

**Stages:**
1. **Criteria analysis** — LLM reads corpus, produces evaluation criteria with regulatory citations (`generateObject` with structured schema)
2. **Structure generation** — LLM proposes pages via `addPage` tool calls (`generateText` with `toolChoice: required`)
3. **Group creation** — Deterministic: one group per page using real page IDs from step 2
4. **Field generation** — Per group, LLM proposes `addField` tool calls grounded in criteria and corpus

**Key files:**
- **Pipeline** ([`pipeline.ts`](src:src/services/form-authoring/pipeline.ts)) — `createAuthoringPipeline(config)` factory, per-stage model configuration
- **Prompts** ([`prompts.ts`](src:src/services/form-authoring/prompts.ts)) — Stage-specific prompt builders
- **Registry** ([`registry.ts`](src:src/services/form-authoring/registry.ts)) — Three variant registries (criteria, structure, generation)
- **Route orchestrator** ([`authoring.tsx`](src:src/entrypoints/app/routes/owner/edit/authoring.tsx)) — Server-side `runBuild` background task with progress tracking
- **Evaluator** ([`evaluator.ts`](src:src/services/form-authoring/evaluator.ts)) — LLM-as-judge for criteria scoring (Haiku)

**CLI evaluation:** `bun run cli evaluate authoring <variant-id>` runs the pipeline against SNAP ground truth fixture and scores field recall/precision/type accuracy.

**Related experiment:** [Authoring pipeline](../experiments/authoring-pipeline/)

## Adding a new LLM integration

When you introduce a new LLM call site:

1. Place the invocation inside a service. If it doesn't fit an existing service, propose a new one (see [software architecture](software-architecture.md)).
2. Expose the orchestrating function through the service's `index.ts`.
3. Add an entry on this page with a `src:` link to the invocation site and any relevant experiment cross-link.
