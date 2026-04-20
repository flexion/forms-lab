---
kind: authoring-pipeline
status: working
title: RAG-Powered Form Authoring Pipeline
---

# RAG-Powered Form Authoring Pipeline

End-to-end test of whether an LLM agent can generate a complete, regulation-compliant government benefits application from a policy corpus alone — no source PDF, no hand-crafted template.

## Status

Working pipeline against a Wisconsin SNAP policy corpus. RAG's contribution is measured via an ablation (see [`rag-ablation-snap`](./rag-ablation-snap)). **The corpus is load-bearing**: without it, the pipeline falls back to a single skeletal page. With it, the model produces a 14-page form that tracks the ground truth's topical structure across eligibility, income, assets, work requirements, verification, expedited service, and Wisconsin-specific administration.

Absolute scores against ground truth are low (10 % recall) — a scorer artifact, not a pipeline failure. See the ablation writeup for why.

## How the pipeline works

Four stages, each independently configurable via the variant system (Settings → Authoring):

1. **Criteria analysis** — LLM reads the corpus and produces evaluation criteria with regulatory citations. Each criterion is an atomic check a reviewer can approve or reject before generation starts.
2. **Structure generation** — LLM derives pages and groups from the approved criteria + policy corpus. The prompt explicitly tells the model to call no tools when input is insufficient, so empty input produces an empty form (validated by the RAG ablation).
3. **Section generation** — per page, the LLM proposes fields with types, labels, required-ness, and sensitivity tags, citing the regulation that requires each.
4. **Auto-evaluation** — LLM-as-judge scores the generated form against the approved criteria. (Deferred for v1; the scorer exists, the wiring into the pipeline is follow-up work.)

## Corpus

[`catalog/references/snap-wisconsin.md`](/catalog/references/snap-wisconsin) — 21 sections covering eligibility (household, income, resources, citizenship, students), deductions, work requirements, expedited service, application/interview/verification, categorical eligibility (TANF/SSI, BBCE), ABAWD time limits, certification periods, reporting changes, fair hearings, and Wisconsin-specific administration (Wis. Stat. 49.79, DHS 1507, ACCESS portal, QUEST card, IM consortia, FSET). Expanded from the original 13-chunk corpus on 2026-04-20 to exercise retrieval more seriously.

## Key findings

1. **RAG more than doubles recall on SNAP authoring.** With the corpus: 10.6 % recall, 14 pages, 140 fields. Without: 4.7 %, 1 page, 7 fields. See [`rag-ablation-snap`](./rag-ablation-snap).

2. **Prompt engineering must not impersonate retrieval.** The first ablation run reported a 7.1 % / 7.1 % tie — the structure prompt had the 8 SNAP page titles hardcoded, so the model reproduced them even with an empty corpus. Rewriting the prompt to derive structure from criteria + corpus exposed the real RAG contribution. A generalisable lesson: before concluding retrieval adds no value, audit the prompts for hidden domain knowledge.

3. **Absolute numbers are gated by the scorer.** Both variants cap around 10 % recall under deterministic field-name matching because the model emits `earned_income_source` where ground truth has `wages_salary_source`. An LLM-as-judge scorer would plausibly lift both variants to 40-60 %. This is a measurement investment, not a pipeline investment.

4. **Haiku is a viable generation model.** Sonnet for criteria + structure (one-time, benefits from richer reasoning); Haiku for per-section generation (repeated, speed matters). Latency drops from ~3 min to ~80 s with no type-accuracy regression.

## Variants

| Variant id | Criteria | Structure | Generation | Use case |
|---|---|---|---|---|
| `all-sonnet` | Sonnet | Sonnet | Sonnet | Highest-quality run for new corpora |
| `no-rag-sonnet` | Sonnet | Sonnet | Sonnet | Ablation control — passes empty corpus to every stage |
| `haiku-generation` | Sonnet | Sonnet | Haiku | Fast interactive use |
| `all-haiku` | Haiku | Haiku | Haiku | Cheapest; trades reasoning depth for speed |

## Running the pipeline

```bash
# Run a single variant end-to-end against the SNAP fixture
bun run cli evaluate authoring all-sonnet

# Ablation: isolate RAG's contribution
bun run cli evaluate authoring no-rag-sonnet

# Compare model-choice variants
bun run cli evaluate authoring compare
```

Artifacts land in a temporary directory by default; pass `--out-dir <path>` to pin them.

## Limitations and next steps

- **Scorer.** Move to an LLM-as-judge scorer so semantic equivalents stop being scored as misses.
- **Per-stage retrieval scoping.** Section generation currently receives the full corpus. A retriever call that pulls only the chunks relevant to "Household Composition" for that section would let fine-grained regulatory detail show through. The retriever exists at `src/services/rag/retrieval.ts`; this is a wiring exercise.
- **Auto-evaluation retry loop.** Once the judge is wired in, failed criteria can feed back into section generation as targeted edits.
- **Harder corpora.** SNAP is well-represented in Sonnet's pre-training. A state waiver form or a recent amendment the model has not seen would separate parametric knowledge from retrieved context more cleanly.

## Related

- [RAG ablation for SNAP authoring](./rag-ablation-snap) — controlled test isolating RAG's contribution
- [PDF field extraction — `sonnet-with-rag`](/catalog/experiments/pdf-field-extraction/sonnet-with-rag) — the separate RAG win on sensitivity labeling during PDF extraction
- [Corpus file](/catalog/references/snap-wisconsin) — the 21 policy chunks the pipeline retrieves from
