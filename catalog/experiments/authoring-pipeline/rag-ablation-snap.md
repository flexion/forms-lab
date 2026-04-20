---
kind: authoring-pipeline
status: working
course-topics: [rag, evaluation, ablation]
---

# RAG Ablation for SNAP Authoring

Controlled test: does the policy corpus measurably improve the generated form for Wisconsin SNAP, or is the LLM's parametric knowledge already sufficient?

## Setup

- **Fixture:** `fixtures/snap-wisconsin/ground-truth.json` — 11 groups, 85 fields representing the reference Wisconsin SNAP application.
- **Corpus:** `catalog/references/snap-wisconsin.md` — 21 sections covering household, income, resources, deductions, work requirements, verification, categorical eligibility, ABAWD, certification periods, fair hearings, and Wisconsin-specific administration.
- **Pipeline stages:** criteria → structure → groups → fields. All stages use Sonnet 4; evaluator uses Haiku 4.5.
- **Variants:**
  - `all-sonnet` — full pipeline with corpus.
  - `no-rag-sonnet` — identical models, but `loadPolicyCorpus()` is replaced with `[]`. Criteria / structure / section prompts all see an empty `## Policy Corpus` block.
- **Scorer:** deterministic field-level matching against ground truth (recall, precision, type accuracy).
- **Run date:** 2026-04-20.

## Results

| Measurement | With RAG | Without RAG | Delta |
|---|---|---|---|
| Criteria extracted | 22 | 0 | −22 |
| Pages generated | 8 | 8 | 0 |
| Groups generated | 8 | 8 | 0 |
| Fields generated | 87 | 81 | −6 |
| Field recall | 7.1 % | **7.1 %** | 0 |
| Field precision | 6.9 % | **7.4 %** | +0.5 |
| Type accuracy | 100 % | 100 % | 0 |
| Wall-clock | 181 s | 153 s | −28 s |

The headline: **the corpus changes the criteria stage output dramatically (22 → 0) but has no measurable impact on the final form.** Precision is marginally better without the corpus.

## Why the two stages diverge

**Criteria extraction is corpus-bound.** `buildCriteriaPrompt` asks the model to "identify the criteria a compliant application form must satisfy" _given the policy corpus_. With an empty corpus, the model correctly returns zero criteria — it has been told to ground itself in the text and refuses to hallucinate.

**Structure and section generation are not.** Two reasons:

1. **The structure prompt has SNAP-specific guidance baked in.** `buildStructurePrompt` lists eight required page titles verbatim ("Applicant Information", "Household Composition", "Income (Earned and Unearned)", ...). The model reproduces that list even with zero criteria and zero corpus. Page/group structure is effectively prompt-engineered, not retrieved.

2. **Section prompts use only the group title + criteria, and Sonnet's parametric knowledge of SNAP is comprehensive.** When asked to fill "Applicant Information" for a SNAP form, Sonnet knows to ask for name, SSN, DOB, address, phone — with or without the corpus. Federal benefits programs are well-represented in pre-training.

## Interpretation

The eval shows that for this combination of model, fixture, and scorer, **RAG is not a net contributor to authoring output quality.** That is not the same as "RAG is useless":

- RAG still drives the criteria stage, which is where auditability lives. Without the corpus, the output has no citations — a compliance engineer reviewing the form can't trace "why is this field here?" to a regulation. That matters for the authoring UX even when it doesn't move the ground-truth comparison metric.
- RAG demonstrates measurable benefit in a different task on the same platform: the `sonnet-with-rag` extraction variant raised sensitivity-label accuracy from 27 % to 53 % against the extraction suite (Pardon, I-9, W-9). Sensitivity classification needs regulatory grounding in a way that "produce a SNAP form" does not.
- The baseline recall of 7.1 % is itself suspicious — a deterministic field-match scorer penalises semantic equivalents (e.g. "first_name" vs "firstName"), different groupings (model merges Earned + Unearned income; ground truth splits them), and ordering. The eval is measuring schema fidelity, not applicant utility.

## What would actually lift the numbers

- **Semantic matching for the scorer.** An LLM-as-judge scorer that accepts "applicant first name" ≈ "first name of applicant" would likely lift both variants to 50-70 % recall without changing the pipeline. That is a measurement investment, not a pipeline investment.
- **Per-stage retrieval scoping.** Right now every stage receives the full corpus. A retriever that pulls "household composition" chunks for the Household Composition section would give the section prompts a focused context that parametric knowledge does not cover (fine-grained Wisconsin-specific rules). The retriever for this is already built (`src/services/rag/retrieval.ts`); the wiring is the missing piece.
- **A harder corpus.** Sonnet already knows SNAP. An ablation against a form the model has _not_ seen — a state-specific waiver form, a recent policy amendment, an obscure supplemental benefit — would separate parametric knowledge from retrieved context more cleanly.

## Artifacts

- `notes/snap-rag-ablation/all-sonnet.json` — full spec + metrics from the with-corpus run.
- `notes/snap-rag-ablation/no-rag-sonnet.json` — same for the empty-corpus run.
- Log files alongside each JSON record the pipeline timing and field counts per section.

## Related

- The RAG extraction variant write-up: [`pdf-field-extraction/sonnet-with-rag`](../pdf-field-extraction/sonnet-with-rag.md). The sensitivity-accuracy lift there is the clearest measurable RAG win in the project.
- Corpus: [`catalog/references/snap-wisconsin.md`](../../references/snap-wisconsin.md).
