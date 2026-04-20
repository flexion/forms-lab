---
kind: authoring-pipeline
status: working
course-topics: [rag, evaluation, ablation]
---

# RAG Ablation for SNAP Authoring

Controlled test: does the policy corpus measurably improve the generated form for Wisconsin SNAP, or is the LLM's parametric knowledge (and prompt scaffolding) already sufficient?

## Setup

- **Fixture:** `fixtures/snap-wisconsin/ground-truth.json` — 11 groups, 85 fields representing the reference Wisconsin SNAP application.
- **Corpus:** `catalog/references/snap-wisconsin.md` — 21 sections covering household, income, resources, deductions, work requirements, verification, categorical eligibility, ABAWD, certification periods, fair hearings, and Wisconsin-specific administration.
- **Pipeline stages:** criteria → structure → groups → fields. All stages use Sonnet 4; evaluator uses Haiku 4.5.
- **Variants:**
  - `all-sonnet` — full pipeline with corpus.
  - `no-rag-sonnet` — identical models, but `loadPolicyCorpus()` is replaced with `[]`. Criteria / structure / section prompts all see an empty `## Policy Corpus` block.
- **Scorer:** deterministic field-level matching against ground truth (recall, precision, type accuracy).
- **Run date:** 2026-04-20 (after structure-prompt de-leak).

## The prompt change that made this eval honest

The first time we ran this ablation, results were near-identical between variants (7.1 % recall each). The reason turned out to be a leaky `buildStructurePrompt` that hard-coded the eight SNAP page titles verbatim:

```
Required pages (call addPage for EACH):
1. Applicant Information
2. Household Composition
3. Income (Earned and Unearned)
...
```

With that text, the model reproduced the page list even when criteria and corpus were both empty. The prompt was doing the RAG's job. Rewriting the prompt to say "derive the form's topical structure from the criteria and policy corpus … if the criteria and corpus are empty, call no tools" is the change that exposes RAG's real contribution.

## Results

| Measurement | With RAG | Without RAG | Delta |
|---|---|---|---|
| Criteria extracted | 21 | 0 | −21 |
| Pages generated | 14 | 1 | −13 |
| Groups generated | 14 | 1 | −13 |
| Fields generated | 140 | 7 | −133 |
| **Field recall** | **10.6 %** | **4.7 %** | **+5.9 pp** |
| Field precision | 6.4 % | 57.1 % | (trade-off, see below) |
| Type accuracy | 88.9 % | 100 % | −11.1 pp |
| Wall-clock | 308 s | 24 s | — |

The headline: **RAG more than doubles recall and enables 20× the field coverage.** Without the corpus, the pipeline outputs a skeletal 1-page, 7-field form that gets basic applicant identity right and ignores the rest.

### Precision × volume trade-off

The no-RAG run's 57 % precision is misleading at face value. It produces 7 total fields — 4 of them match ground truth (first name, SSN, date of birth, address-style common fields). The ratio is high because the numerator and denominator are both tiny.

The with-RAG run emits 140 fields and matches 9 of ground truth's 85. Lower precision, but meaningfully higher coverage. For the authoring use case — "generate me a compliant SNAP form so I don't have to write it from scratch" — the with-RAG behaviour is overwhelmingly better even with lower precision per field. The user reviews and prunes; they can't invent fields the model didn't propose.

### Structure shaped by the corpus

With RAG, the 14 generated pages track ground truth's topical structure much better than the earlier leaky-prompt run (8 pages). Pages that exist only because of corpus sections we added:

- **Citizenship and Immigration Status** — from 7 CFR 273.4
- **Student Status and Eligibility** — from 7 CFR 273.5
- **Categorical Eligibility** — from 7 CFR 273.2(j)
- **Change Reporting and Certification** — from 7 CFR 273.12 + 273.10(f)
- **Shelter and Utility Expenses** — from 7 CFR 273.9(d) (previously merged into "Expenses and Deductions")
- **Earned Income / Unearned Income** — previously merged; now split as in ground truth

The corpus is clearly shaping structural decisions the model would not otherwise make.

## Interpretation

For this combination of model, fixture, and scorer, **the RAG pipeline doubles recall and produces a form that is topically faithful to the policy**. The earlier "nothing burger" finding was a prompt-leakage artifact, not a capability limit.

RAG still has failure modes worth stating:

- **Field-name divergence caps the absolute score.** Even the with-RAG 10.6 % undercounts real quality — the model produces `earned_income_source` where ground truth has `wages_salary_source`, and the deterministic scorer marks it as a miss. An LLM-as-judge scorer would likely lift both variants substantially.
- **Precision is low because coverage is high.** Pruning is a UX problem, not a pipeline problem: the #87 criteria approval UI + per-field review is exactly what handles this. The important thing is that the model emits *candidates* the reviewer can accept or delete.
- **Type accuracy dropped from 100 % to 89 %.** With RAG emitting more fields, a small number end up mis-typed (choice where it should be text, boolean where it should be choice). This is a worthwhile follow-up — the schema-refinement work in #56 already tightens one axis of this.

## What this says about the earlier negative result

The previous version of this writeup reported a 7.1 % / 7.1 % tie and concluded RAG was inert for SNAP authoring. That conclusion was wrong, and the reason matters: **the leaky structure prompt was impersonating the RAG.** If you want to measure retrieval, the prompt has to be genuinely corpus-dependent. This is a general lesson — ablation requires you to audit the prompts for hidden domain knowledge first.

## What would still lift the numbers

- **LLM-as-judge scorer.** The 10.6 % cap is largely the scorer penalising semantic equivalents. An LLM judge that accepts `wages_salary_source` ≈ `earned_income_source` would plausibly report 40-60 % recall.
- **Per-stage retrieval scoping.** Section generation currently gets the full 21-chunk corpus. If it got only the chunks relevant to "Household Composition", fine-grained detail would have a cleaner signal.
- **Harder fixtures.** Forms the model has not seen in pre-training (state waiver forms, recent policy amendments) would separate parametric knowledge from retrieved context more cleanly than SNAP does.

## Artifacts

- `notes/snap-rag-ablation/all-sonnet.json` — full spec + metrics from the with-corpus run.
- `notes/snap-rag-ablation/no-rag-sonnet.json` — same for the empty-corpus run.
- Log files alongside each JSON record the pipeline timing and field counts per section.

## Related

- The RAG extraction variant write-up: [`pdf-field-extraction/sonnet-with-rag`](../pdf-field-extraction/sonnet-with-rag.md). The sensitivity-accuracy lift there is a second, independent RAG win on the project.
- Corpus: [`catalog/references/snap-wisconsin.md`](../../references/snap-wisconsin.md).
- Structure prompt: [`src/services/form-authoring/prompts.ts`](../../../src/services/form-authoring/prompts.ts).
