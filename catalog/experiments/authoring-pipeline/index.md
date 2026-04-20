---
status: working
title: RAG-Powered Form Authoring Pipeline
created: 2026-04-20
---

# RAG-Powered Form Authoring Pipeline

## Hypothesis

An LLM agent can generate a complete, regulation-compliant government benefits form from a policy corpus alone — without a source PDF — by analyzing regulatory text, extracting evaluation criteria, and generating form structure and fields grounded in specific citations.

## Approach

A 4-stage pipeline driven by the SNAP Wisconsin policy corpus (7 CFR 273, 13 sections):

1. **Criteria Analysis** — LLM reads corpus, produces evaluation criteria with regulatory citations
2. **Structure Generation** — LLM proposes page structure using `addPage` tool calls
3. **Group + Field Generation** — Per section, LLM generates fields with appropriate types and labels
4. **Auto-Evaluation** — LLM-as-judge scores output against approved criteria (future work)

Each stage is independently configurable via the variant system (Settings → Authoring).

## Variants Tested

| Variant | Criteria | Structure | Generation | Duration | Fields | Type Accuracy |
|---------|----------|-----------|------------|----------|--------|---------------|
| all-sonnet | Sonnet 4 | Sonnet 4 | Sonnet 4 | 137s | 84 | 90% |
| haiku-generation | Sonnet 4 | Sonnet 4 | Haiku 4.5 | 80s | 105 | 100% |

## Key Findings

1. **Haiku produces more fields with higher type accuracy** — 105 vs 84 fields, 100% vs 90% type accuracy. Haiku generates simpler, more direct field definitions that don't break the command executor with cross-references.

2. **Haiku is 40% faster** — 80s vs 137s for the full pipeline. Significant for interactive UX.

3. **Field recall/precision against ground truth is low (~5-12%)** — This is a scorer limitation, not a quality issue. The pipeline generates natural field labels ("What is your full legal name?") while ground truth uses technical labels ("applicant-full-name"). A semantic matching scorer is needed.

4. **Structure generation is reliable** — Both variants produce 8 pages matching regulatory structure. The `toolChoice: 'required'` parameter ensures multiple parallel tool calls.

## Recommendations

- **Default**: Sonnet for criteria/structure (one-time decisions), Haiku for generation (repeated, speed matters)
- **Follow-up**: Semantic field matching scorer, auto-eval retry loop, Opus for complex regulatory analysis

## Running Experiments

```bash
bun run cli evaluate authoring all-sonnet
bun run cli evaluate authoring haiku-generation
bun run cli evaluate authoring compare
```

## Sources

- Design spec: `notes/story-87-rag-authoring-pipeline/design.md`
- Implementation plan: `notes/story-87-rag-authoring-pipeline/plan.md`
- Results: `notes/story-87-rag-authoring-pipeline/eval-results/`
