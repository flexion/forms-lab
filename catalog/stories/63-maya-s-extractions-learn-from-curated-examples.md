---
issue: 63
title: Maya's extractions learn from curated examples
milestone: "Final Project"
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.187Z
---

## User Story

As **Maya**, in order to **improve extraction quality on complex government forms by teaching the model what good output looks like**, I want **an extraction variant that uses curated few-shot examples without requiring fine-tuning**.

## Preconditions

- #58 (Story 10 variant picker) merged to main

## Acceptance Criteria

- [ ] New variant `extraction/few-shot-sonnet` that prepends 2-3 canonical (PDF description → spec) exemplar pairs to the extraction prompt
- [ ] Exemplars committed under `src/services/extraction/exemplars/` (or similar); each includes a short description, a compact spec, and rationale for inclusion
- [ ] Extraction tab in Settings → Variants lists the few-shot variant
- [ ] Evaluation run comparing `sonnet` baseline vs `few-shot-sonnet` on all three fixtures with the LLM-judge scorer
- [ ] Both scorers (deterministic + LLM-judge) reported
- [ ] New catalog page `catalog/experiments/pdf-field-extraction/few-shot-sonnet.md` with exemplar descriptions, approach, metrics, and findings on what the exemplars seemed to help with
- [ ] `catalog/experiments/_roadmap.md` updated with shipped status and one-line finding

## Success Metrics

- Non-trivial delta (positive or negative) in at least one metric vs the Sonnet baseline — teaches us something either way
- Exemplars are documented well enough that another contributor could add more

## Notes

- Class topic: prompt conditioning (Ch 8)
- Keep exemplar count small (2-3) to avoid blowing token budget
- Consider exemplars that deliberately demonstrate edge cases (nested groups, sensitivity labels, conditional fields)

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable