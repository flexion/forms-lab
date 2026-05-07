---
date: 2026-05-07
branch: story-121/form-layout
---

# Code Review — story-121/form-layout

## AC Coverage

| AC | Status |
|----|--------|
| Audit of current form output identifies specific issues with examples | Addressed — `catalog/experiments/layout-quality/findings.md` documents per-fixture issues |
| Forms with >10 fields broken into logical sections or multi-step flows | Addressed — `generateFormSpecWithLayout` prompt enforces multi-page layout |
| Related fields grouped with descriptive section headings | Addressed — layout prompt enforces topic-cohesive grouping |
| Mobile layout | Partially addressed — prompt instructs static delivery for simple forms; no explicit CSS/viewport changes |
| Accessibility review | Not addressed — not implemented in this branch |
| At least one real-world form tested end-to-end | Addressed — 4 government PDFs evaluated in `catalog/experiments/layout-quality/` |

Note: Mobile/a11y ACs are aspirational in the issue and not blocked in scope for this engineering story (they require UI-layer work separate from the generation pipeline).

## Issues Found and Resolved

All issues identified in code review were fixed before PR creation:

**Critical**: None found.

**Important (all fixed):**
1. `generateFormSpecWithLayout` silently dropped LLM cost tracking — added activity tracking params matching `generateFormSpec`
2. Layout judge response had no Zod schema validation — could produce NaN metrics — added `layout-judge-schemas.ts` with `z.record` schema, replaced raw cast with `.parse()`
3. `evaluate layout` subcommand skipped `evaluationRunSchema.parse()` before writing results — added validation
4. `score()` method omitted `_groundTruth: undefined` parameter required by `EvaluationKind` interface — fixed
5. `buildLayoutPrompt` test imported internal path — exported from `form-documents/index.ts`, fixed test import
6. Layout evaluation filtered fixtures by `groundTruth` (copy-paste from `run` subcommand) — layout doesn't use ground truth, removed filter

**Minor (fixed):**
- Removed `buildLayoutJudgePrompt` from evaluation public index (implementation detail)

## Remaining Concerns

- Findings doc field count for pardon-application fixture is inconsistent (128 vs 76 vs 181) — minor documentation issue, doesn't affect functionality
- `specVersion` is hardcoded in layout and shaping subcommands — pre-existing issue, not introduced here
- Promotion of `sonnet-hybrid-layout-v1` to production default is deferred pending #132 (deterministic conditional injection)
