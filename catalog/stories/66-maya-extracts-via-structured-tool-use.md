---
issue: 66
title: Maya extracts via structured tool-use
milestone: "Final Project"
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.187Z
---

## User Story

As **Maya**, in order to **get extractions that can't produce invalid JSON because the model is constrained by schema at generation time**, I want **an extraction variant that uses AI SDK tool-use instead of free-JSON prompting**.

## Preconditions

- #58 (Story 10 variant picker) merged to main

## Acceptance Criteria

- [ ] New variant `extraction/tool-use-sonnet` using AI SDK tool-use with one tool per top-level spec operation (add_group, add_field, set_conditions, etc.) — same pattern established for shaping
- [ ] Validation failure rate tracked during evaluation runs (count of responses that fail the output schema pre-retry)
- [ ] Extraction tab in Settings → Variants lists the tool-use variant
- [ ] Evaluation run comparing baseline Sonnet (free-JSON) vs tool-use on all fixtures
- [ ] New catalog page `catalog/experiments/pdf-field-extraction/tool-use-sonnet.md` including: tool vocabulary, validation-failure-rate comparison, and metric deltas
- [ ] `catalog/experiments/_roadmap.md` updated with shipped status and one-line finding

## Success Metrics

- Zero schema-validation failures on tool-use variant (by construction)
- Meaningful comparison vs free-JSON baseline on extraction quality metrics — demonstrates whether structural constraint helps or hurts content quality

## Notes

- Class topic: constrained generation (Ch 7)
- Pattern already exists for shaping at `src/services/forms/shaping/tools.ts` — study it before implementing
- Tool vocabulary should be small — the goal is demonstrating constrained output, not reinventing the extraction schema

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable