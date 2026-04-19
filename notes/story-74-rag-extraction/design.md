---
status: working
audience: future-claude-session
created: 2026-04-19
---

# Story 74 — RAG Extraction Variant — Design

## Problem

Maya needs extractions grounded in the regulatory text that governs each
form. The current Sonnet extractor produces a `DataCollectionSpec` from
the PDF alone. When an ambiguous field appears (e.g. an I-9 "List A"
document versus "List B + C" combo), the model guesses from the PDF
label rather than consulting 8 CFR 274a. For a government-forms
platform this is both a trust and a correctness problem.

The Assignment 9 homework used ChromaDB + sentence-transformers in
Python. We cannot ship that: this codebase is pure TypeScript running
under Bun, and a vector-DB service dependency would be far heavier than
the problem warrants. The corpus is *three* fixture forms.

## Goal

Register an `extraction/sonnet-with-rag` variant that retrieves short
regulatory excerpts per fixture and prepends them to the Step-1
extraction prompt under a `## Policy Context` section. The delta
between this variant and baseline Sonnet answers the question: "does
grounding help extraction quality on government forms?"

## Non-goals

- No ChromaDB, no Python, no external vector-DB service.
- No changes to the baseline extraction prompt.
- No citation field on `DataCollectionSpec` (that was a nice-to-have in
  #62; #74 cuts it to keep scope bounded).
- No cross-fixture retrieval — each fixture keys its own policy
  chunks. The corpus is 3 fixtures and retrieval keyed on the slug is
  sufficient.

## Approach

### Retrieval primitive

A single-file service at `src/services/rag/retrieval.ts` exposing:

```ts
interface PolicyChunk {
  id: string            // e.g. 'i-9/8-cfr-274a-2-b-1'
  source: string        // e.g. '8 CFR 274a.2(b)(1)'
  title: string         // short human label
  text: string          // verbatim excerpt
  formSlug: string      // which fixture this applies to
}

interface Embedder {
  embed(text: string): Promise<number[]>
}

interface PolicyRetriever {
  retrieve(query: string, k: number): Promise<PolicyChunk[]>
}

function createInMemoryRetriever(
  chunks: PolicyChunk[],
  embedder: Embedder,
): Promise<PolicyRetriever>
```

- Embedding pipeline: load N chunks, call `embedder.embed` for each,
  store `{chunk, vector}` pairs in an array. Retrieval cosine-sorts
  against the query vector and returns top-k.
- Normalisation: embeddings are L2-normalised at ingest (Titan v2
  returns normalised vectors by default; the fallback embedder does
  the same) so cosine reduces to a dot product.
- No persistence. In-memory only. The corpus rebuilds on every
  extractor construction.

### Embedder

Two implementations share the `Embedder` interface:

1. **Bedrock Titan** (`createTitanEmbedder`) — calls
   `amazon.titan-embed-text-v2:0` via `embed` from the `ai` SDK. 1024
   dims, normalised. This is the default.
2. **Hash fallback** (`createHashEmbedder`) — deterministic 256-dim
   vector derived from SHA-256 byte slices, L2-normalised. Used when
   Bedrock is unavailable (CI, offline dev) and documented as a
   fallback in the catalog page. It is *not* a good retriever in the
   absolute sense — but with only 3 documents and a slug-keyed query,
   it reliably picks the right chunks because each chunk's text
   contains the slug.

The production build always attempts Titan first. The registry wires
the Titan embedder directly; the hash embedder is exported for tests
and for a future env-based fallback.

### Retrieval key

Per the task brief: slug is simplest and sufficient with only 3
fixtures and keep-it-simple retrieval. The extractor is already slug-
agnostic — the `PdfExtractor` interface takes a `Buffer`, not a slug.
We solve this by threading the slug through `ExtractionOptions.slug`
(optional) and adding a fallback that reads the first 500 characters
of PDF text when no slug is provided. Tests cover both paths; the
evaluation harness already has the slug and will pass it.

### Prompt wiring

Given top-k policy chunks, we prepend to the Step-1 extraction prompt:

```
## Policy Context

The following regulatory excerpts govern this form. Use them to inform
field types, sensitivity labels, and required-ness.

### [source 1]: [title 1]
[text 1]

### [source 2]: [title 2]
[text 2]

---

[existing extraction prompt]
```

This mirrors the few-shot `## Examples` pattern in `buildExemplarSection`.
The new helper `buildPolicyContextSection(chunks)` is added to
`extraction.ts`. `createBedrockPdfExtractor` accepts a `retriever`
option and, when present, retrieves top-k=2 chunks and prepends the
section before the rest of Step-1.

### Variant registration

```ts
registry.register({
  id: 'sonnet-with-rag',
  metadata: {
    name: 'Claude Sonnet 4 (RAG)',
    description: 'Retrieves policy excerpts from a curated corpus of
      CFR/USC sections and prepends them to the extraction prompt.
      Grounds extractions in the regulatory text governing each form.',
    status: 'experimental',
    courseTopics: ['evaluation', 'rag', 'retrieval'],
    catalogPath: '/catalog/experiments/pdf-field-extraction/sonnet-with-rag',
    modelId: SONNET_MODEL_ID,
    pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
  },
  create: () => {
    const embedder = createTitanEmbedder()
    const retrieverPromise = createInMemoryRetriever(policyCorpus, embedder)
    return createBedrockPdfExtractor({
      model: SONNET_MODEL_ID,
      retriever: retrieverPromise,
      retrievalK: 2,
    })
  },
})
```

The lazy-promise pattern keeps construction sync while allowing the
first extraction to await the embedder. Subsequent extractions reuse
the resolved retriever.

### Policy corpus

Three markdown files under `catalog/references/`:

- `catalog/references/pardon-application.md` — DOJ 28 CFR 1.1–1.11
  (eligibility, waiting period, application contents, character
  references).
- `catalog/references/i-9.md` — 8 CFR 274a.2 (List A, List B, List C
  documents; three-business-day rule; employer/employee attestation).
- `catalog/references/w-9.md` — 26 USC 6109 (TIN requirement) +
  Privacy Act notice + backup withholding certification.

Each file has a small YAML frontmatter (`formSlug`, `citations`) and
one or more `## Section — <cite>` subsections. The corpus loader
parses these into `PolicyChunk` objects. ~500 words per fixture;
verbatim regulatory language preferred for grounding fidelity.

### Testing strategy

Unit tests (all fast, no Bedrock calls):

1. `test/rag-retrieval.test.ts` — stub embedder returns deterministic
   vectors; verify cosine ranking, top-k truncation, empty-corpus
   behaviour.
2. `test/rag-corpus-loader.test.ts` — reads the three markdown files
   and asserts slug/chunk counts.
3. `test/extraction-rag-prompt.test.ts` — uses the `...aiModule`
   spread mock pattern; asserts the Step-1 prompt contains
   `## Policy Context` and a retrieved chunk's source string.
4. `test/extraction-registry.test.ts` — adds a case for the new
   variant id, course topics, status.

The Bedrock Titan embedder itself is not unit-tested against a live
endpoint — the `embed` call is a thin wrapper. We test construction
(model id passed correctly) and trust the SDK for the rest.

## Risks

- **Titan embedding latency.** Each chunk embeds in ~100–300 ms. With
  9 chunks total (3 per fixture) this adds ~1–3 s to extractor
  construction. Acceptable.
- **Retrieval misses on novel PDFs.** If a future fixture has no
  matching chunk, retrieval returns the two highest-cosine chunks
  anyway — possibly irrelevant. Mitigation: document in catalog page
  that the corpus is fixture-scoped.
- **Prompt bloat.** Two chunks × ~250 tokens each = ~500 extra tokens
  per extraction. Marginal cost noted in the catalog "Cost" section.

## Open questions (resolved)

- *Why slug-keyed retrieval vs first-500-chars-of-PDF?* With k=2 and
  only 9 chunks, the distinction is academic. Slug is simpler and
  reproducible. The fallback to first-500-chars of PDF text is
  implemented but not used by the evaluation harness.
- *Why k=2?* One chunk risks under-grounding (the W-9 privacy notice
  alone omits the TIN requirement). Three bloats the prompt without
  adding information — each fixture has 3 chunks, so k=3 is just "all
  of them". k=2 is the middle ground.
