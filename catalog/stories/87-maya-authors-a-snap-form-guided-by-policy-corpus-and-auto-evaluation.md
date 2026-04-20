---
issue: 87
title: Maya authors a SNAP form guided by policy corpus and auto-evaluation
milestone: "Final Project"
labels: [user-story]
state: closed
synced_at: 2026-04-20T15:40:03.186Z
---

## User Story

As a **form creator (Maya)**, in order to **build a compliant SNAP application grounded in federal and state policy without memorizing regulations**, I want **an agent-guided pipeline that reads my policy corpus, proposes evaluation criteria, generates form structure and fields with regulatory citations, and auto-evaluates its output before I review it**

## Preconditions

- [ ] Existing shaping command infrastructure (24 commands, executor, staged-changes UI)
- [ ] RAG service with corpus loader, embeddings, and in-memory retrieval
- [ ] Project git repo with `references/` directory support
- [ ] Bedrock access for Sonnet and Haiku models

## Acceptance Criteria

- [ ] SNAP Wisconsin policy corpus (~10-15 chunks from 7 CFR 273) available as fixture in `catalog/references/snap-wisconsin.md`
- [ ] SNAP Wisconsin test fixture in `fixtures/snap-wisconsin/` with manifest, ground-truth, and source PDF
- [ ] Corpus loader supports project-scoped `references/*.md` via `projectDir` option
- [ ] Stage 1: Agent analyzes corpus and proposes evaluation criteria as English sentences with regulatory citations
- [ ] Stage 1: Human can review, edit, add, remove, and approve criteria via UI
- [ ] Stage 2: Agent proposes page/group skeleton as shaping commands grounded in approved criteria and corpus
- [ ] Stage 2: Human reviews commands in staged-changes UI, can accept/reject/redirect via chat
- [ ] Stage 3: Agent generates fields per section with topic-scoped RAG retrieval (~5-15 commands per group)
- [ ] Stage 4: LLM-as-judge evaluates each section against approved criteria (pass/fail/partial)
- [ ] Stage 4: Failed criteria trigger automatic retry with specific feedback (max 2 retries)
- [ ] Eval scorecard displayed alongside staged commands before human review
- [ ] Pipeline artifacts persisted in git: `criteria.json`, `eval-results.json`
- [ ] Per-stage model configuration (Sonnet for stages 1-3, Haiku for eval)
- [ ] Stage indicator in project UI showing pipeline progress
- [ ] Existing reactive shaping chat continues to work at any pipeline stage

## Success Metrics

- Pipeline produces a complete SNAP form (6+ pages, 10+ groups, 50+ fields) from corpus alone
- Auto-eval catches at least one missing regulatory requirement per run and self-corrects via retry
- Policy expert (persona A) can skip stages and shape manually without friction
- Form output usable as test fixture by existing evaluation harness

## Notes

- Design spec: `notes/2026-04-19-rag-authoring-pipeline-design.md`
- New service at `src/services/form-authoring/` — does not modify existing shaper
- When source PDF is provided (Stage 0), existing extraction pipeline bootstraps initial state
- Corpus upload UI is deferred — corpus pre-loaded as fixtures for now
- Repeating groups (household members) modeled as static Member 1/2/3 — known limitation
- Fallback scope: cut auto-eval inner loop if time-constrained; criteria still generated and reviewed
- Temperature 0 across all stages for determinism
- Estimated ~25 Bedrock calls for a full SNAP form run (~3-5 min wall clock)

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Threat model updated if security-relevant
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable