---
issue: 59
title: Maya chooses her shaping model
milestone: "Final Project"
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story

As **Maya**, in order to **choose which LLM drives form shaping and see how different models perform on that task**, I want **shaping variants to be selectable from Settings → Variants, backed by a quantitative benchmark**.

## Preconditions

- #58 (Story 10 variant picker) merged to main

## Acceptance Criteria

- [ ] New evaluation kind `shaping-commands` scores a variant against scripted intents with expected `Command[]` outputs (precision/recall on command-kind + args)
- [ ] Variants registered: `shaping/haiku`, `shaping/sonnet` (promoted baseline), `shaping/opus`
- [ ] Shaping tab in Settings → Variants renders all three variants with descriptions and Learn more links
- [ ] Provenance recorded in `shaping-log.json` entries (extend existing entry schema with variantId + modelId)
- [ ] `<VariantBadge task="shaping" ...>` rendered wherever shaping output is shown (review/compare views)
- [ ] New catalog suite `catalog/experiments/shaping-model-comparison/` with `_suite.md`, `haiku.md`, `sonnet.md`, `opus.md`, each containing metrics, approach, and findings
- [ ] `catalog/experiments/_roadmap.md` updated: row marked `shipped`, one-line finding added
- [ ] Existing `catalog/experiments/shaping-architecture/` entries remain intact (architecture story is separate from model comparison)

## Success Metrics

- Meaningful recall/precision separation between variants across ~6 scripted intents (same set as the shaping-architecture qualitative comparison)
- Picker UI renders cleanly on every screen that renders shaping output

## Notes

- Seeded intents already exist in `catalog/experiments/shaping-architecture/_suite.md` — reuse them as the benchmark corpus
- `src/services/forms/shaping/registry.ts` already exists with a Sonnet-only entry — extend it, don't replace
- The picker's filling/mapping tabs stay empty until their respective stories land

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Tests pass (bun run check)
- [ ] Type checking passes
- [ ] Threat model updated if security-relevant
- [ ] CI pipeline green
- [ ] Deployed and demoable