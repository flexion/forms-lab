---
issue: 60
title: Carlos's conversation uses a chosen model
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-20T15:40:03.187Z
---

## User Story

As **Maya**, in order to **pick which LLM drives Carlos's conversational form-filling experience and see how different models perform on adaptive interviewing**, I want **filling variants to be selectable from Settings → Variants, backed by persona-driven evaluation**.

## Preconditions

- #58 (Story 10 variant picker) merged to main
- #9 (Story 9 conversational sections) merged to main

## Acceptance Criteria

- [ ] New evaluation kind `filling-interview` scores a variant against scripted personas (completeness of collected fields + conditional routing accuracy), mirroring the assignment-10 TextGrad evaluator pattern
- [ ] Variants registered: `filling/haiku`, `filling/sonnet`, `filling/opus`
- [ ] Filling tab in Settings → Variants renders all three variants
- [ ] Session records variantId at start (new column on form_sessions table)
- [ ] `<VariantBadge task="filling" ...>` rendered on conversation UI
- [ ] Persona fixtures committed (5 train + 3 test minimum)
- [ ] New catalog suite `catalog/experiments/filling-model-comparison/` with `_suite.md` + one markdown per variant, each with metrics + findings
- [ ] `catalog/experiments/_roadmap.md` updated with shipped status and one-line finding

## Success Metrics

- Observable tradeoff across variants (e.g., Opus higher completeness, Haiku faster/cheaper)
- Persona-driven eval runs reproducibly from `bun run cli evaluate run <variant>`

## Notes

- Port evaluator shape from `llm-class-2026-winter-cohort/notes/assignment-10/` — persona-driven simulator + completeness scorer
- Filling registry stub exists at `src/services/forms/filling/registry.ts` (empty); extend it

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable