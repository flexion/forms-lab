---
issue: 61
title: Maya verifies AcroForm mapping
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-20T15:40:03.187Z
---

## User Story

As **Maya**, in order to **verify the field mapping between the extracted spec and the source PDF's AcroForm fields was done correctly and compare how different models handle mapping**, I want **field-mapping variants to be selectable from Settings → Variants, with mapping-accuracy evaluation**.

## Preconditions

- #58 (Story 10 variant picker) merged to main

## Acceptance Criteria

- [ ] New evaluation kind `field-mapping` scores spec-field → PDF-field matches against reviewed ground-truth mappings on the three fixtures (pardon, I-9, W-9)
- [ ] Deterministic scorer (exact name match) and LLM-judge scorer (Opus) both implemented
- [ ] Variants registered: `field-mapping/haiku`, `field-mapping/sonnet`, `field-mapping/opus`
- [ ] Field-mapping tab in Settings → Variants renders all three variants
- [ ] Provenance recorded for field-mapping in `forms/default/provenance.json` under `"field-mapping"` key
- [ ] `<VariantBadge task="field-mapping" ...>` rendered on the edit/review UI where the mapping is visible
- [ ] New catalog suite `catalog/experiments/field-mapping/` with `_suite.md` + variant pages containing metrics (recall, precision, confidence)
- [ ] `catalog/experiments/_roadmap.md` updated with shipped status and one-line finding

## Success Metrics

- LLM-judge vs deterministic scorer deltas captured (demonstrates evaluation methodology affects measured performance)
- Ground-truth mappings committed for at least the three existing fixtures

## Notes

- Mapping registry stub exists at `src/services/form-documents/mapping-registry.ts`; extend it
- Field-mapping generation already occurs during extraction (see `src/services/form-documents/extraction.ts`) — this story is about making the model swappable and evaluating

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable