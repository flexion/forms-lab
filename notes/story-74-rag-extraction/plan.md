---
status: working
audience: future-claude-session
created: 2026-04-19
---

# Story 74 — Plan

Commits in order (one logical change each):

1. **docs(story-74): design and plan for RAG extraction**
   - `notes/story-74-rag-extraction/{design.md,plan.md}`

2. **feat(rag): add in-memory retrieval primitive with cosine similarity**
   - `src/services/rag/retrieval.ts` — types, cosine, in-memory
     retriever factory, hash fallback embedder.
   - `test/rag-retrieval.test.ts` — stubbed embedder; top-k ordering,
     k truncation, empty corpus.
   - `src/services/rag/index.ts` — barrel.

3. **feat(rag): add Bedrock Titan embedder**
   - `src/services/rag/titan-embedder.ts` — calls
     `bedrock.embeddingModel('amazon.titan-embed-text-v2:0')` via
     `embed` from the `ai` SDK.
   - `test/rag-titan-embedder.test.ts` — mocks `ai.embed`; asserts the
     model id passed and that the returned embedding is surfaced.

4. **docs(catalog/references): seed policy corpus for pardon, I-9, W-9**
   - `catalog/references/pardon-application.md`
   - `catalog/references/i-9.md`
   - `catalog/references/w-9.md`
   - Each ~500 words, verbatim CFR/USC excerpts, YAML frontmatter.

5. **feat(rag): add policy corpus loader**
   - `src/services/rag/corpus.ts` — reads the three markdown files,
     parses frontmatter + sections into `PolicyChunk[]`.
   - `test/rag-corpus-loader.test.ts` — happy path, slug filter.

6. **feat(extraction): build RAG context section for extraction prompt**
   - Add `buildPolicyContextSection(chunks)` and `retriever` / `retrievalK`
     options to `createBedrockPdfExtractor`.
   - Wire into Step-1 prompt before the existing text (after the
     exemplar section would be, in the default-variant branch; no
     change to the hybrid-variant branch).
   - `test/extraction-rag-prompt.test.ts` — ai-module spread mock,
     assert the prompt contains `## Policy Context` and the retrieved
     chunk's source string; assert no context section when retriever
     omitted.

7. **feat(extraction): wire sonnet-with-rag variant into registry**
   - `src/services/extraction/registry.ts` — register the variant.
   - `src/services/extraction/rag-corpus.ts` — loads the corpus once
     and returns a Titan-backed retriever promise.
   - Extend `test/extraction-registry.test.ts` with a case for the new
     id.

8. **docs(catalog): stub sonnet-with-rag catalog page**
   - `catalog/experiments/pdf-field-extraction/sonnet-with-rag.md` with
     sections for Approach / Metrics (placeholder) / Findings
     (placeholder) / Course Connection / Cost.

9. **docs(roadmap): mark story 74 in-progress**
   - Update `catalog/experiments/_roadmap.md` row and
     `notes/experiment-orchestration.md` status table.

After 9: run `bun run check`. If green, run the live eval:

```
AWS_REGION=us-east-1 AWS_BEDROCK_REGION=us-east-1 \
  bun run cli evaluate run sonnet-with-rag --scorer llm-judge
```

Then:

10. **docs(catalog): fill sonnet-with-rag findings**
    - Real metrics + 2–3 bullet findings, course connection tightened
      to the actual numbers.

11. **docs(roadmap): mark story 74 pr-open**
    - Flip both the roadmap row and the orchestration table to
      `pr-open`.

Push and `gh pr create --draft --base experiment/73-prompt-optimization`.

## Guardrails

- **Architecture rule:** `src/services/rag/` depends only on
  `src/shared/` (none needed here) and other `src/services/` — no
  entrypoint or design-system imports.
- **Exports:** Types belong to the RAG service (P3). The extractor
  imports only `PolicyRetriever` and `PolicyChunk` (type-only where
  possible).
- **No mock.module in unit tests** except with the `...aiModule`
  spread pattern documented in `test/extraction-temperature.test.ts`.
- **Corpus files** go in `catalog/references/` not `src/`. They are
  content, not code. The loader uses `fs` relative to the project root
  (like `fixtures/index.ts`).
