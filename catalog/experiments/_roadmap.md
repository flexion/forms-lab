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
| [#59 Maya chooses her shaping model](https://github.com/flexion/forms-lab/issues/59) | shipped | shaping eval-kind, `shaping/haiku`, `shaping/sonnet`, `shaping/opus`, shaping tab in picker | `/catalog/experiments/shaping-model-comparison/` (new suite). Scoring kind is deterministic (command-kind precision/recall + arg accuracy). Live metrics landed via [#75](https://github.com/flexion/forms-lab/issues/75): opus 73/83/67%, sonnet 67/75/62%, haiku 67/83/62%. Model size is not the dominant lever for this suite. |
| [#75 Run live shaping model evaluation](https://github.com/flexion/forms-lab/issues/75) | pr-open | `evaluate shaping <variant-id>` CLI subcommand, live metrics on all three shaping variants | `/catalog/experiments/shaping-model-comparison/{haiku,sonnet,opus}.md` populated. Finding: three of six intents are at ceiling across all models; two fail across all models — the bottleneck is prompt disambiguation (renamePage vs renameGroup, quoted group-name resolution), not model size. |
| [#60 Carlos's conversation uses a chosen model](https://github.com/flexion/forms-lab/issues/60) | planned | filling eval-kind (personas + scripts), `filling/haiku`, `filling/sonnet`, `filling/opus`, filling tab in picker | `/catalog/experiments/filling-model-comparison/` (new suite) |
| [#61 Maya verifies AcroForm mapping](https://github.com/flexion/forms-lab/issues/61) | planned | field-mapping eval-kind, `field-mapping/haiku`, `field-mapping/sonnet`, `field-mapping/opus`, mapping tab in picker | `/catalog/experiments/field-mapping/` (new suite) |

## Capability stories — parallel after #10 merges

| Story | Status | Ships | Catalog |
|---|---|---|---|
| [#62 Maya's extractions cite the law](https://github.com/flexion/forms-lab/issues/62) | planned | RAG primitive (embeddings + cosine store), policy corpus, `extraction/sonnet-with-rag` | `/catalog/experiments/pdf-field-extraction/sonnet-with-rag.md` |
| [#63 Maya's extractions learn from curated examples](https://github.com/flexion/forms-lab/issues/63) | shipped | `extraction/few-shot-sonnet`, `extraction/nova-pro` | `/catalog/experiments/pdf-field-extraction/few-shot-sonnet.md`. Finding: precision +7.6pp over baseline; recall -6.8pp. Few-shot helps model be selective, not comprehensive. Nova Pro (non-Claude) fails at field-level extraction entirely. |
| [#64 Maya's extractions use a tuned prompt](https://github.com/flexion/forms-lab/issues/64) | planned | prompt-opt harness, `extraction/sonnet-optimized-v1` | `/catalog/experiments/pdf-field-extraction/sonnet-optimized-v1.md` |
| [#73 Maya's extractions use temperature + hybrid prompt](https://github.com/flexion/forms-lab/issues/73) | pr-open ([PR #76](https://github.com/flexion/forms-lab/pull/76)) | `extraction/sonnet-temperature-zero`, `extraction/sonnet-hybrid-v1` | `/catalog/experiments/pdf-field-extraction/sonnet-temperature-zero.md`, `/catalog/experiments/pdf-field-extraction/sonnet-hybrid-v1.md`. Finding: hybrid-v1 wins the suite (precision 99.2%, recall 72.6%, sensitivity +23.8pp over baseline). Temp=0 alone is the largest precision lever (+15.1pp) but costs recall. Assignment 10's prompt-shape rank ordering (hybrid > few-shot > verbose) reproduces on Sonnet. |
| [#65 Maya's extractions use our fine-tuned model](https://github.com/flexion/forms-lab/issues/65) | scope-deferred | — | `/catalog/experiments/pdf-field-extraction/lora-scope-deferral.md`. Deferred: prompt engineering achieves target quality on Claude; LoRA adds cost without new learning for this deadline. |
| [#66 Maya extracts via structured tool-use](https://github.com/flexion/forms-lab/issues/66) | shipped | `extraction/tool-use-sonnet` | `/catalog/experiments/pdf-field-extraction/tool-use-sonnet.md`. Finding: precision 96.3%, sensitivity +51pp. Constrained output eliminates hallucination at cost of recall (step-limit). |

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
