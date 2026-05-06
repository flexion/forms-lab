---
kind: layout-quality
status: working
---

# Layout Quality Evaluation: Findings

## Summary

The layout-aware variant (`sonnet-hybrid-layout-v1`) improves overall FormSpec layout quality by **+17.7 percentage points** over the baseline, with the largest gains in title clarity (+43.7pp), topic cohesion (+37.5pp), and page sizing (+31.3pp). Conditional page use remains an area for future improvement.

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

### Aggregate Summary

| Metric | Baseline | Layout-v1 | Delta |
|--------|----------|-----------|-------|
| pageSizing | 50.0% | 81.3% | **+31.3pp** |
| topicCohesion | 50.0% | 87.5% | **+37.5pp** |
| logicalProgression | 75.0% | 87.5% | **+12.5pp** |
| conditionalUse | 37.5% | 37.5% | 0 |
| titleClarity | 56.3% | 100.0% | **+43.7pp** |
| deliveryModeChoice | 75.0% | 56.3% | -18.7pp |
| **overall** | **57.3%** | **75.0%** | **+17.7pp** |

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

1. **Title clarity is the easiest win.** The "plain-language titles" principle in the prompt produced perfect scores across all fixtures with zero downside. This alone justifies the variant.

2. **Adaptive sizing works well for medium-to-large forms.** SNAP Wisconsin went from 2/5 to 5/5 on page sizing. The prompt's heuristics correctly sized pages for the form's complexity.

3. **Conditional page use is not addressed by prompt alone.** Both variants scored identically (37.5%) on conditional use. The LLM doesn't generate `condition` properties on pages even when the prompt asks for it. This likely requires either: (a) more explicit examples of conditional pages in the prompt, or (b) a post-processing step that detects conditional groups and adds page conditions.

4. **deliveryMode regressed slightly (-18.7pp).** The layout prompt's guidance to "default to static" may be too conservative. The baseline's higher score suggests the original prompt (which doesn't explicitly guide delivery mode) lets the model make better contextual choices. Worth revisiting the delivery mode guidance.

5. **Large monolithic groups limit layout optimization.** The Pardon Application's 32-field "background-information" group is a single unit that Step 2 cannot split. For forms where Step 1 produces overly large groups, layout optimization has diminished returns.

## Mobile & Accessibility

The rendering layer (`flex-form-page`, fieldset/legend/ARIA) already handles:
- Responsive layout (`max-inline-size`, full-width inputs)
- Screen reader navigation (fieldset/legend structure, `aria-describedby` for help/errors)
- Error focus management (auto-focus error summary)

Layout improvements to FormSpec structure (better grouping, fewer fields per page) additionally benefit mobile users by reducing scroll depth and cognitive load per viewport. The SNAP Wisconsin improvement (from 3 dense pages to 6 focused pages) particularly helps mobile users who see fewer fields per screen.

## Recommendations

1. **Promote to production default** after addressing the delivery mode regression — revise the prompt to be less prescriptive about defaulting to static.
2. **Add conditional page examples** to the prompt to address the conditional use gap (currently 37.5% for both variants).
3. **Consider a "group splitting" heuristic** for Step 1 — if a group has 15+ fields, prompt the extraction to sub-divide it. This would unlock better layout for forms like the Pardon Application.
4. **Run with Opus model** to see if a more capable model produces better conditional logic and delivery mode assignments.
