---
issue: 64
title: Maya's extractions use a tuned prompt
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-20T15:40:03.187Z
---

## User Story

As **Maya**, in order to **get better extraction quality without changing the underlying model**, I want **an extraction variant whose system prompt has been automatically optimized against the evaluation suite**.

## Preconditions

- #58 (Story 10 variant picker) merged to main

## Acceptance Criteria

- [ ] New service `src/services/prompt-optimization/` — thin wrapper around TextGrad (or equivalent) that drives our existing `EvaluationKind` harness as its training signal
- [ ] Optimization script produces a concrete optimized prompt for extraction, committed as a file under `src/services/extraction/prompts/optimized-v1.txt` (or similar)
- [ ] New variant `extraction/sonnet-optimized-v1` that loads the optimized prompt at construction
- [ ] Extraction tab in Settings → Variants lists the optimized variant
- [ ] Evaluation run comparing baseline `sonnet` vs `sonnet-optimized-v1` on all fixtures
- [ ] New catalog page `catalog/experiments/pdf-field-extraction/sonnet-optimized-v1.md` including: optimization setup (epochs, batch size, forward/backward models), before/after prompt snippets, and metric deltas
- [ ] `catalog/experiments/_roadmap.md` updated with shipped status and one-line finding
- [ ] Harness documented well enough that follow-on stories can run it against shaping and filling suites

## Success Metrics

- Optimized variant beats baseline on at least one metric (recall, precision, or sensitivity)
- Optimization is reproducible via a single CLI command

## Notes

- Class topic: prompt optimization, Assignment 10
- Use Opus as the backward model if it fits the budget; Sonnet otherwise
- Document hyperparameters for reproducibility
- Follow-on stories (not in scope here): `shaping/sonnet-optimized-v1`, `filling/sonnet-optimized-v1` — same harness, different eval kind

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable