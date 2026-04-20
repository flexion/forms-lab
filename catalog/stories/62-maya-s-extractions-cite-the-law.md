---
issue: 62
title: Maya's extractions cite the law
milestone: "Final Project"
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.187Z
---

## User Story

As **Maya**, in order to **trust that the LLM understood what my form is legally required to collect and defend that decision to stakeholders**, I want **extractions to cite the relevant regulatory text for each field, grounded via retrieval from a curated policy corpus**.

## Preconditions

- #58 (Story 10 variant picker) merged to main

## Acceptance Criteria

- [ ] New service `src/services/rag/` with embeddings client (Bedrock Titan or Voyage), in-memory cosine-similarity store, and a minimal retrieval API
- [ ] Policy corpus committed under `catalog/references/` or similar — CFR/USC excerpts relevant to the existing fixture forms (immigration for I-9, tax for W-9, criminal for pardon)
- [ ] New variant `extraction/sonnet-with-rag` that retrieves top-k policy chunks per section and attaches citations to each field's `description`
- [ ] Extraction tab in Settings → Variants lists the RAG variant with a Learn more link to its catalog page
- [ ] Generated spec fields include a `citation` field (extend `DataCollectionSpec` schema)
- [ ] Evaluation run comparing `sonnet` vs `sonnet-with-rag` on sensitivity/type accuracy (hypothesis: grounding improves sensitivity labels, may hurt or help recall)
- [ ] New catalog page `catalog/experiments/pdf-field-extraction/sonnet-with-rag.md` with approach, corpus used, metrics, and findings
- [ ] `catalog/experiments/_roadmap.md` updated with shipped status and one-line finding

## Success Metrics

- Every extracted field in the RAG variant output has at least one citation attached, OR the catalog page documents why some fields have none
- Measurable delta on sensitivity accuracy between baseline and RAG variants

## Notes

- Class topic: RAG, grounding, vector DB (Ch 9 in the syllabus)
- Consider in-memory store for simplicity — no external vector DB dependency this round
- Citations should reference source + section (e.g., "8 CFR 274a.2(b)(1)(i)(A) — List A identity and employment authorization")

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Type checking passes
- [ ] Threat model updated (external knowledge source introduced)
- [ ] CI pipeline green
- [ ] Deployed and demoable