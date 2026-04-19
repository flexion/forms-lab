---
kind: pdf-field-extraction
implementation: sonnet-with-rag
status: current
course-topics: [evaluation, rag, retrieval]
---

# PDF Field Extraction: Claude Sonnet 4 (RAG)

> Selectable in **Settings → Variants → Extraction**.

## Approach

Retrieves top-k=2 policy excerpts from a curated corpus and prepends
them to the Step-1 extraction prompt under a `## Policy Context`
section. The corpus is three markdown files under
`catalog/references/`, one per fixture (pardon application, I-9, W-9),
each containing ~500 words of verbatim CFR/USC text.

| Component | Implementation |
|---|---|
| Embedder | `amazon.titan-embed-text-v2:0` (1024-dim, L2-normalised) |
| Vector store | In-memory array, cosine similarity |
| Retrieval key | Fixture slug (fallback: first 500 chars of PDF) |
| k | 2 |
| Corpus | 3 files × 3 sections each = 9 chunks total |

No ChromaDB, no Python, no external service — the primitive lives
under `src/services/rag/` in <200 lines of TypeScript. A deterministic
hash-based embedder is bundled as a fallback for environments where
Bedrock is unavailable.

## Metrics (LLM Judge, Opus scorer)

<!-- Populated by commit 10 after the eval run. -->
_Placeholder — metrics land after the live eval._

## Findings

<!-- Populated by commit 10 after the eval run. -->
_Placeholder — findings land after the live eval._

## Course Connection

Assignment 9 in the syllabus covered RAG with ChromaDB and
sentence-transformers in Python. This variant ports the same idea to
the production pipeline — grounding a generation call in retrieved
context — but keeps the primitive small and in-process because the
corpus is three fixtures, not a knowledge base. The Embedder interface
abstraction (Titan / hash / stub) is what makes the small primitive
viable: retrieval logic is independent of the embedder, and tests use
a stub vector space rather than a real model call.

The homework's finding that "grounding helps small models more than
large models" is the hypothesis this variant tests on Claude Sonnet 4.
If sensitivity accuracy improves materially, the policy corpus is
pulling weight. If recall drops, the model is over-indexing on the
regulatory text at the expense of field completeness — the same
strategy inversion documented in the few-shot results.

## Cost

Same Sonnet model plus the Titan embedding calls done once at
extractor construction (~9 calls, one per chunk, ≈$0.00001 total at
Titan pricing — negligible).

Per-extraction cost: baseline Sonnet + ~500 additional input tokens
(two chunks, ~250 tokens each). Marginal cost ≈ $0.0015 per
extraction.

| Model | Input $/1K | Output $/1K | Est. Cost/Extraction |
|---|---|---|---|
| Sonnet (baseline) | $0.003 | $0.015 | $0.15-0.40 |
| Sonnet (RAG) | $0.003 | $0.015 | $0.15-0.41 |
| Titan embeddings (one-time) | $0.00002 | — | ≈$0.00001 for 9 chunks |
