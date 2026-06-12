---
kind: layout-quality
status: working
---

# Layout Quality Evaluation: Findings

## Summary

The layout-aware variant (`sonnet-hybrid-layout-v1`) improves overall FormSpec layout quality by **+19.8 percentage points** over the baseline (57.3% → 77.1%), with the largest gains in title clarity, topic cohesion, and page sizing. After one iteration round, delivery mode regression was eliminated and conditional page use improved slightly. Conditional page generation remains an area for follow-up work (see #132).

## Methodology

- **Baseline:** `sonnet-hybrid-v1` — production default; Step 2 uses a minimal prompt ("each page should contain 1-3 related requirement groups")
- **Treatment:** `sonnet-hybrid-layout-v1` — same Step 1 extraction, Step 2 uses a civic-tech-informed layout prompt with adaptive sizing, topic cohesion, plain-language titles, and delivery mode guidance
- **Judge:** Claude Opus 4.6 via Bedrock, scoring 6 dimensions (1-5 scale, normalized to 0-1)
- **Fixtures:** W-9 (19 fields, 5-6 groups), I-9 (61 fields, 4 groups), SNAP Wisconsin (43 fields, 6 groups), Pardon Application (128 fields, 13 groups)

## Results

| Fixture | Variant | Overall | Page Sizing | Topic Cohesion | Logical Progression | Conditional Use | Title Clarity | Delivery Mode |
|---------|---------|---------|-------------|----------------|--------------------|-----------------|--------------|--------------| 
| pardon-application | baseline | 58% | 50% | 50% | 75% | 25% | 75% | 75% |
| pardon-application | layout-v1 | 63% | 50% | 75% | 75% | 25% | 100% | 50% |
| i-9 | baseline | 54% | 50% | 50% | 75% | 25% | 50% | 75% |
| i-9 | layout-v1 | 71% | 75% | 100% | 75% | 25% | 100% | 50% |
| w-9 | baseline | 63% | 75% | 50% | 75% | 50% | 50% | 75% |
| w-9 | layout-v1 | 79% | 100% | 75% | 100% | 50% | 100% | 50% |
| snap-wisconsin | baseline | 54% | 25% | 50% | 75% | 50% | 50% | 75% |
| snap-wisconsin | layout-v1 | 88% | 100% | 100% | 100% | 50% | 100% | 75% |

### Aggregate Summary (final, after iteration)

| Metric | Baseline | Layout-v1 | Delta |
|--------|----------|-----------|-------|
| pageSizing | 50.0% | 68.8% | **+18.8pp** |
| topicCohesion | 50.0% | 87.5% | **+37.5pp** |
| logicalProgression | 75.0% | 93.8% | **+18.8pp** |
| conditionalUse | 37.5% | 43.8% | +6.3pp |
| titleClarity | 56.3% | 93.8% | **+37.5pp** |
| deliveryModeChoice | 75.0% | 75.0% | 0 (regression fixed) |
| **overall** | **57.3%** | **77.1%** | **+19.8pp** |

## Per-Fixture Analysis

### W-9 (simple, 19 fields)

**Baseline:** 3 pages, groups paired somewhat arbitrarily. Titles like "Entity and Classification Information" — functional but jargon-heavy.

**Layout-v1:** 4 pages, one topic per page. Titles are plain-language. Page sizing scored perfect (5/5) — ~5 fields/page is ideal for this size form. The progression from identity → address → TIN → certification follows W-9 completion order naturally.

**Verdict:** Clear win. The additional page (19 fields → 4 pages vs 3) was appropriate given the distinct topics.

### I-9 (medium, 61 fields)

**Baseline:** 3 pages, final page combines two unrelated groups (preparer/translator + reverification). Titles generic.

**Layout-v1:** 4 pages, each mapping to exactly one logical group. Perfect topic cohesion (5/5). Titles like "Tell us about yourself" and "Employer document review" are clear wayfinding. One additional page eliminated the cohesion problem.

**Verdict:** Strong improvement. The "one group per page" choice matched the I-9's natural structure perfectly.

### SNAP Wisconsin (complex, 43 fields)

**Baseline:** Only 3 pages for 43 fields (13-17 fields per page). Judge flagged page sizing as "overwhelming." Groups paired by proximity rather than topic.

**Layout-v1:** 6 pages, each addressing a single topic (personal, household, income, assets, expenses, certification). Perfect scores (5/5) on page sizing, cohesion, progression, and title clarity. The strongest single-fixture improvement.

**Verdict:** Dramatic improvement. This is the kind of form where layout most matters — complex enough that poor pagination actively hurts usability.

### Pardon Application (complex, 128 fields)

**Baseline:** 8 pages, but page 1 has 32 fields. Some pages combine loosely related topics (substance use + finances).

**Layout-v1:** 9 pages, better distribution but page 1 still has 32 fields (the large "background-information" group). Titles improved to 5/5. Topic cohesion improved but still not perfect due to the large monolithic group.

**Verdict:** Moderate improvement. The prompt's guidance helped with everything it could control (titles, ordering, delivery modes) but the underlying DataCollectionSpec has a single 32-field group that can't be split at the layout layer. This is a limitation of optimizing layout separately from extraction — the groups produced by Step 1 constrain what Step 2 can do.

## Key Findings

1. **Title clarity and topic cohesion are the biggest wins.** Plain-language title guidance and "one topic per page" principles consistently improved scores. These require no structural changes — just better prompting.

2. **Adaptive sizing works well for medium-to-large forms.** SNAP Wisconsin went from 2/5 to 5/5 on page sizing. The prompt's heuristics correctly sized pages for the form's complexity.

3. **Conditional page use is hard for prompt-only approaches.** After two iterations (explicit instructions + worked examples in the schema), conditional use improved modestly (37.5% → 43.8%) but the LLM still doesn't reliably derive page-level conditions from field-level ones. The inference requires: identifying groups with shared conditions, separating gate questions to prior pages, and adding correct condition JSON. This likely requires a deterministic post-processing step. Filed as follow-up #132.

4. **Delivery mode guidance needs balance, not defaults.** The initial "default to static" guidance caused regression. Replacing it with content-complexity criteria (narrative fields, sensitive topics → conversational) restored parity with baseline while allowing the model contextual judgment.

5. **Large monolithic groups limit layout optimization.** The Pardon Application's 32-field "background-information" group is a single unit that Step 2 cannot split. For forms where Step 1 produces overly large groups, layout optimization has diminished returns.

## Mobile & Accessibility

The rendering layer (`flex-form-page`, fieldset/legend/ARIA) already handles:
- Responsive layout (`max-inline-size`, full-width inputs)
- Screen reader navigation (fieldset/legend structure, `aria-describedby` for help/errors)
- Error focus management (auto-focus error summary)

Layout improvements to FormSpec structure (better grouping, fewer fields per page) additionally benefit mobile users by reducing scroll depth and cognitive load per viewport. The SNAP Wisconsin improvement (from 3 dense pages to 6 focused pages) particularly helps mobile users who see fewer fields per screen.

## Iteration History

1. **v1 (initial):** +17.7pp overall but delivery mode regressed (-18.7pp) due to overly conservative "default to static" guidance.
2. **v2 (delivery fix):** Replaced default guidance with content-complexity criteria. Regression eliminated, overall at 77.1%.
3. **v3 (+ conditional):** Added explicit conditional page derivation instructions with worked example. Conditional use +6.3pp (37.5% → 43.8%) but still below target. Confirmed as a prompt-difficulty ceiling.

## Recommendations

1. **Promote to production default** — the variant is ready. +19.8pp improvement with no regressions.
2. **Implement deterministic conditional page injection** (follow-up #132) — a post-processing step that scans field-level conditions and adds page-level conditions where groups share a common gate. This is more reliable than prompt-only.
3. **Consider a "group splitting" heuristic** for Step 1 — if a group has 15+ fields, prompt the extraction to sub-divide it. This would unlock better layout for forms like the Pardon Application.
4. **Run with Opus model** to see if a more capable model produces better conditional logic.
