---
issue: 65
title: Maya's extractions use our fine-tuned model
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-20T15:40:03.187Z
---

## User Story

As **Maya**, in order to **demonstrate that a small fine-tuned model can match or beat prompted larger models on a narrow domain task**, I want **an extraction variant powered by a LoRA fine-tune of a small open model, served from our own inference endpoint**.

## Preconditions

- #58 (Story 10 variant picker) merged to main
- Training data pipeline exists (can be bootstrapped in this story)

## Acceptance Criteria

- [ ] Training dataset committed under `data/fine-tuning/extraction/` — at least 50 (PDF description → spec) pairs, either hand-curated from fixtures or Opus-generated and reviewed
- [ ] LoRA fine-tuning script under `scripts/fine-tune-extraction.ts` (or language appropriate to the trainer)
- [ ] Trained adapter checkpoint committed or clearly documented with retrieval instructions
- [ ] FastAPI inference endpoint deployed to existing EC2, reachable via the app's Caddy routing — separate NixOS service, managed alongside the main app
- [ ] New variant `extraction/lora-v1` in the extraction registry that calls the inference endpoint via HTTP
- [ ] Extraction tab in Settings → Variants lists the LoRA variant
- [ ] Evaluation run comparing the LoRA variant against Sonnet/Haiku baselines
- [ ] New catalog page `catalog/experiments/pdf-field-extraction/lora-v1.md` including: base model, training data size, LoRA rank/alpha, training hyperparameters, deployment architecture, and metric deltas vs baselines
- [ ] `catalog/experiments/_roadmap.md` updated with shipped status and one-line finding
- [ ] If scope becomes unachievable (time/cost), catalog page clearly marks `scope-deferred` with reasoning — "attempted" is an honest outcome

## Success Metrics

- Either: the LoRA variant ships and hits a reasonable recall number (>50%), OR the catalog honestly documents what was attempted and what blocked shipping
- If shipped, cost-per-extraction documented vs API variants

## Notes

- Class topic: fine-tuning (Ch 5), MLOps (Ch 4), production deployment (Ch 6) — the headline rubric item
- Base model choice: smallest viable — Llama 3.2 3B or Mistral 7B
- Cost gate: explicit user approval before GPU training spend
- This is the most ambitious story; acceptable to scope-defer with a written explanation

## Definition of Done

- [ ] Acceptance criteria met (or clearly documented scope-deferral)
- [ ] Tests pass
- [ ] Type checking passes
- [ ] Threat model updated (new service, new external training process)
- [ ] CI pipeline green
- [ ] Deployed and demoable