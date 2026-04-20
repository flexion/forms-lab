---
issue: 74
title: Maya's extractions cite the law (RAG)
milestone: ""
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.186Z
---

## User Story

As **Maya**, in order to **get extractions that reference relevant regulations and form instructions**, I want **an extraction variant that retrieves policy context via RAG before extracting fields**.

## Context

The homework repo has a working ChromaDB + sentence-transformers RAG implementation. This story brings retrieval-augmented generation into the extraction pipeline: embed form instructions/CFR sections, retrieve relevant context for the uploaded PDF, and include it in the extraction prompt.

## Acceptance Criteria

- [ ] RAG retrieval primitive (embeddings + vector store) integrated
- [ ] Policy corpus seeded (form instructions for the 3 evaluation fixtures)
- [ ] New variant `extraction/sonnet-with-rag` registered
- [ ] Evaluation run comparing RAG variant against baseline Sonnet
- [ ] Catalog page with findings and course connection
- [ ] Roadmap updated

## Definition of Done

- [ ] Tests pass (`bun run check`)
- [ ] Evaluation complete with LLM judge
- [ ] Catalog page documents approach, metrics, and course connection