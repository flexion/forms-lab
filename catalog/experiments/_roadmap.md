---
status: working
---

# Experiment Roadmap

This is the live roadmap for the Forms Lab LLM experiments. Each experiment is a user-story that ships a new variant (or a new task suite) that Maya or Carlos can select at runtime via **Settings → Variants**. The picker, provenance convention, and evaluation harness are already in place; this roadmap tracks the breadth of variants we're building on top of them.

## How to read this

- **Status** — `planned` (issue filed), `in-progress` (branch open), `shipped` (merged to main), `scope-deferred` (intentionally not shipping; capture why).
- **Ships** — the variant(s) or infrastructure that become user-selectable when the story lands.
- **Depends on** — what has to merge first.
- **Catalog pages** — where findings land when the story ships.

## Trunk

| Story | Status | Ships |
|---|---|---|
| [#10 Maya chooses how her form was extracted](/catalog/stories) | in-progress ([PR #58](https://github.com/flexion/forms-lab/pull/58)) | variant picker, preferences service, provenance convention, `<VariantBadge>`, expanded fixtures (I-9, W-9), registry-driven extraction |

## Picker tabs — parallel after #10 merges

| Story | Status | Ships | Catalog |
|---|---|---|---|
| [#59 Maya chooses her shaping model](https://github.com/flexion/forms-lab/issues/59) | planned | shaping eval-kind, `shaping/haiku`, `shaping/sonnet`, `shaping/opus`, shaping tab in picker | `/catalog/experiments/shaping-model-comparison/` (new suite) |
| [#60 Carlos's conversation uses a chosen model](https://github.com/flexion/forms-lab/issues/60) | planned | filling eval-kind (personas + scripts), `filling/haiku`, `filling/sonnet`, `filling/opus`, filling tab in picker | `/catalog/experiments/filling-model-comparison/` (new suite) |
| [#61 Maya verifies AcroForm mapping](https://github.com/flexion/forms-lab/issues/61) | planned | field-mapping eval-kind, `field-mapping/haiku`, `field-mapping/sonnet`, `field-mapping/opus`, mapping tab in picker | `/catalog/experiments/field-mapping/` (new suite) |

## Capability stories — parallel after #10 merges

| Story | Status | Ships | Catalog |
|---|---|---|---|
| [#62 Maya's extractions cite the law](https://github.com/flexion/forms-lab/issues/62) | planned | RAG primitive (embeddings + cosine store), policy corpus, `extraction/sonnet-with-rag` | `/catalog/experiments/pdf-field-extraction/sonnet-with-rag.md` |
| [#63 Maya's extractions learn from curated examples](https://github.com/flexion/forms-lab/issues/63) | pr-open | `extraction/few-shot-sonnet` | `/catalog/experiments/pdf-field-extraction/few-shot-sonnet.md` |
| [#64 Maya's extractions use a tuned prompt](https://github.com/flexion/forms-lab/issues/64) | planned | prompt-opt harness, `extraction/sonnet-optimized-v1` | `/catalog/experiments/pdf-field-extraction/sonnet-optimized-v1.md` |
| [#65 Maya's extractions use our fine-tuned model](https://github.com/flexion/forms-lab/issues/65) | planned | LoRA fine-tune, FastAPI inference endpoint, `extraction/lora-v1` | `/catalog/experiments/pdf-field-extraction/lora-v1.md` |
| [#66 Maya extracts via structured tool-use](https://github.com/flexion/forms-lab/issues/66) | planned | `extraction/tool-use-sonnet` | `/catalog/experiments/pdf-field-extraction/tool-use-sonnet.md` |

## Priority tiers

**Tier 1 — must land for presentation.** #10 trunk, plus at least one story from each of the picker-tab and capability tracks, plus prompt optimization. These together demonstrate evaluation, model selection, and one prompt-engineering technique — the core of the rubric.

**Tier 2 — should land.** Additional picker tabs, few-shot, structured tool-use. Each adds breadth.

**Tier 3 — aspirational.** LoRA + inference endpoint. Captured as a story even if we don't ship it — the catalog will reflect "scope-deferred" with the why.

## Conventions

1. **Every variant story ends at the catalog.** The definition of done includes a markdown page in the appropriate suite directory with metrics, approach, and tradeoffs. No catalog entry → not done.
2. **Evaluation is mandatory.** A variant without an evaluation run doesn't get merged. If the evaluation required is qualitative, the catalog page explains the evaluation method.
3. **Status lives here.** When a story lands, this file updates: status becomes `shipped`, and a one-line finding is added to the row.

## Governance

- Issues tracked under the **Final Project** milestone, label `user-story` (plus `llm-integration` where applicable).
- Design and plan docs land in `notes/story-<N>-<short-name>/` before implementation.
- See the [architecture principles](/catalog/decisions/architecture/architecture-principles) for how these variants respect the layered service design.
