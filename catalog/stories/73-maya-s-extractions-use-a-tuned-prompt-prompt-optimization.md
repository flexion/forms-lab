---
issue: 73
title: Maya's extractions use a tuned prompt (prompt optimization)
milestone: ""
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.186Z
---

## User Story

As **Maya**, in order to **get better extraction quality by applying the prompt engineering techniques proven in the coursework**, I want **extraction prompt variants optimized using the hybrid and few-shot strategies from Assignment 10**.

## Context

Assignment 10 showed:
- Hybrid prompt (concise instructions + 1 example) achieved 98-100% on Mistral 8B
- Temperature tuning (0.2 → 0.0) eliminated 1% failure variance at zero cost
- TextGrad automated optimization produced worse results than hand-crafted prompts

This story applies those findings to the extraction pipeline specifically: test temperature=0, test a hybrid-style extraction prompt, and measure with the existing eval harness.

## Acceptance Criteria

- [ ] Temperature=0 variant registered and evaluated (measures the "free optimization" from homework)
- [ ] Hybrid-style extraction prompt tested (shorter instructions + 1 complete example extraction)
- [ ] Evaluation results with LLM judge scorer on all 3 fixtures
- [ ] Catalog page with findings, course connection, and comparison to baseline
- [ ] Roadmap updated

## Definition of Done

- [ ] Tests pass (`bun run check`)
- [ ] Evaluation complete
- [ ] Catalog page with documented findings