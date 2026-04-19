# Experiment Roadmap

**Date:** 2026-04-18
**Status:** draft
**Target:** final project presentation 2026-04-20

## Purpose

Stand up a production variant picker across every LLM touchpoint in Forms Lab, then run breadth-first experiments as parallel variants. Each variant is user-toggleable, operationalized in AWS, and interlinked with the catalog.

## Principles

1. **Vertical slices only.** Every story delivers user-visible value. Preconditions ship as part of the first slice that needs them.
2. **Breadth with honest depth.** Cover many class techniques (evaluation, model selection, RAG, fine-tuning, prompt optimization, tool use) without overreaching on any one. Unshipped items are captured as "attempted, scope limit hit" entries — the catalog is honest, not aspirational.
3. **Parallelizable stories.** After the trunk lands, stories fan out across worktrees with minimal conflict surface.
4. **Catalog is the source of truth.** Every variant gets a catalog page; every story links to its variants' pages.

## Story list

### Trunk

| # | Story | Unlocks | Depends on | Status |
|---|-------|---------|------------|--------|
| 10 | Maya chooses how her form was extracted | generic variant registry, preferences service, picker UI, badge, provenance, fixture expansion | — | planned |

### Picker tabs (parallel after 10)

| # | Story | Ships | Depends on | Status |
|---|-------|-------|------------|--------|
| 11 | Maya chooses her shaping model | shaping eval-kind, E3 variants (haiku/sonnet/opus) | 10 | planned |
| 12 | Carlos's conversation uses a chosen model | filling eval-kind, E4 variants | 10, story 9 merged | planned |
| 13 | Maya verifies AcroForm mapping | field-mapping eval-kind, E5 variants | 10, story 7 merged | planned |

### Capability stories (parallel after 10)

| # | Story | Ships | Depends on | Status |
|---|-------|-------|------------|--------|
| 14 | Maya's extractions cite the law | RAG primitive, E7 policy-grounded extraction variant | 10 | planned |
| 15 | Maya's extractions learn from curated examples | E1 few-shot variant | 10 | planned |
| 16 | Maya's extractions use a tuned prompt | prompt-opt harness, E6a optimized extraction variant | 10 | planned |
| 16b | Shaping uses a tuned prompt | E6b | 11, 16 | planned |
| 16c | Interviewer uses a tuned prompt | E6c | 12, 16 | planned |
| 17 | Maya's extractions use our fine-tuned model | LoRA FastAPI on EC2, E8 variant | 10 | planned (heavy, gated) |
| 18 | Maya extracts via structured tool-use | E2 tool-use variant | 10 | planned |

## Priority tiers

**Tier 1 — must land:** 10, 11, 14 or 15 (whichever is faster), 16

**Tier 2 — should land:** 12, 13, 16b, 16c, 18

**Tier 3 — aspirational:** 17 (LoRA), the other of 14/15

Items that don't ship go into the catalog as "attempted, scope deferred" with the reasoning captured.

## Coordinator and skills

A coordinator session and `start-experiment` / `run-experiment-roadmap` skills are deferred until after Story 10 merges. Pattern must exist in code before skills can codify it.

Until the coordinator exists, parallel execution is manual: one Claude session per story, each on its own worktree, following `/start-story` conventions.

## Catalog integration

Each story creates or updates entries under `catalog/experiments/<suite>/`. The picker UI links to these pages so Maya can understand what each variant does and how it was evaluated.

This file is the human-readable index. A machine-readable `notes/experiment-roadmap.yaml` arrives with the coordinator skill.
