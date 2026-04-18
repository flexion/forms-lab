---
status: draft
date: 2026-04-17
---

# Review / Preview tab: design plan

## Problem

The compare page's **Preview** tab renders two full `flex-spec-browser` instances (base and head) side-by-side. For anything larger than a toy form this is a wall of text with no visual signal of where the changes are. On the canonical use case — approving an initial PDF import with ~50 new fields — the reviewer scrolls two mirrored walls of panels, and every panel looks important because they all look the same.

The **Changes** tab already lists a flat semantic diff — that tab is fine. The Preview tab is what needs to change: it must help the reviewer see *how* the changes land inside the form's structure, not just *that* they exist.

## Reviewer questions, staged by depth

A reviewer moves through three questions, each demanding different affordances:

1. **"What does this PR do at a glance?"** — one-screen summary, counts, severity (is any page removed? Are sensitive fields added?).
2. **"What needs my attention?"** — *changed* items surfaced up front, ordered by page/group so the structural context is preserved.
3. **"How do I understand this specific change?"** — when I click into a field that's been added, I want to see its neighbors (the rest of the group it joined), its page (where in the flow it appears), and the before/after values for `modified`/`renamed` cases.

Secondary questions that show up during review:
- "Does this change break something else?" (conditions that reference a renamed/removed field)
- "Is this change consistent with neighboring fields?" (a new ZIP field should look like the other ZIP fields)
- "Where did this group move to?" (moved/reordered pages)

The current Preview tab answers only a weak version of #1 (counts exist in the header) and nothing of #2 or #3 beyond "scroll and compare manually."

## Survey of established patterns

**GitHub PR diff.** Two modes: *unified* and *split*. Defaults to collapsed files with a change summary; clicking expands hunks. "Show 3 lines of context" expands surrounding unchanged lines. File tree sidebar acts as a minimap. Keyboard shortcuts (`j`/`k`) jump change-to-change. What's applicable: (a) the collapsed-by-default posture, (b) the change-focused sidebar/minimap, (c) "reveal surrounding context on demand."

**Google Docs suggesting mode.** Inline marks (strike-through, underline, color) within the *normal reading flow* of the document. Change list in a right panel; clicking scrolls and highlights. What's applicable: changes live inside the document's natural structure — the reader never loses their place. Good for *modified/renamed* cases.

**Figma branching & merging.** Shows changed *frames* as thumbnails with a hover/peek overlay of before vs after. Structural (not line-by-line) diff. What's applicable: domain-specific units (frames = our pages/groups/fields) rather than textual lines.

**Notion page history.** Timeline of versions; selecting one shows a textual diff. Less relevant — we already have a History tab for this.

**Storybook a11y add-on / backstop.js visual regression.** Side-by-side thumbnails with a "diff" toggle that colour-overlays changed pixels. Not directly applicable to structured data, but the "three modes: A, B, A-vs-B" UI idiom is worth borrowing.

**GitHub's "Files changed" search and the `...` context expanders** are the single most important pattern here: *default to the change, expand to the context.*

### Pattern dimensions, applied

| Dimension | Current | What's useful |
|---|---|---|
| Focus modes | Full-context only | "Changed only" default, "all" on toggle |
| Visual density | Two mirrored panels | Inline badges + before/after rows |
| Change scoping | Per-field inside a mirrored full tree | Per-page with changed items grouped |
| Navigation | None (manual scroll) | Mini change-list sidebar; `#anchor` jumps |
| Context reveal | Always-on | Expand-on-demand per page/group |

## Three design directions

### Direction A: Annotated single view ("GitHub Files Changed" for forms)

**Core idea.** Replace the two mirrored browsers with one head-side browser that has change badges inline, and a "changes only" toggle. Base is only shown inline for `modified`/`renamed` cases (as a strike-through or a muted "was" line).

**"What needs my attention?"** Each page/group/field with a change gets a badge (`+ New`, `~ Modified`, `- Removed`, `↕ Moved`). A top-of-panel summary lists changed pages with anchor links. In "Changes only" mode (default when >N unchanged items exist), unchanged groups collapse to a single "N unchanged groups — show" row, GitHub-style.

**"How do I understand this change?"** The field sits inside its page and group context. Clicking a field's badge reveals an inline detail row with the before/after values (for `modified`), the referenced `condition` chain, and a "peek" into the group's other fields if the group itself is new.

**Shape.** Extend `flex-spec-browser` (or introduce a sibling `flex-spec-diff-browser`) that takes `{ dataSpec, formSpec, changes, mode: 'changed-only' | 'all' }`. Internally each page panel receives the list of `SpecChange` entries whose `path` starts with its page id, and each group panel similarly. Panels with changes open by default; unchanged ones collapse to a counting summary.

**Tradeoffs.**
- *Pros.* One view to read. Scales to the initial-import case (every item marked `new` — still readable as a single left-to-right walk). Matches the mental model reviewers already have from GitHub. Reuses most of `flex-spec-browser`.
- *Cons.* Loses the literal side-by-side feel; some reviewers want to see base at all times. "Changed only" mode for an initial import collapses nothing (everything is new), so the affordance is invisible there.

### Direction B: Changes-list-driven, with inline previews

**Core idea.** The Preview tab becomes a list of *changes* (like the Changes tab, but richer). Each change is a card that inlines the relevant slice of form structure — the field's group, or the page's groups — expandable for more context.

**"What needs my attention?"** The list *is* the attention surface: there's nothing else to look at. Changes are ordered by (page position, group position, field position) so reading top-to-bottom reconstructs the form's flow.

**"How do I understand this change?"** Each card has a "context" disclosure: expanding it renders the full parent group (for a field change) or the full page (for a group change), with the changed item highlighted. A "compare base" disclosure shows the before state for `modified`/`renamed`.

**Shape.** A new `flex-spec-change-feed` component taking `{ changes, baseView, headView }`. Cards are `<details>` elements; reveal is native.

**Tradeoffs.**
- *Pros.* Maximal signal-to-noise for small PRs. Each change is a self-contained unit — easy to comment on (future), easy to link to.
- *Cons.* Falls apart on the initial-import case: 50+ identical "added field X" cards with no global form flow. Re-reading the whole form structure means expanding every card. Effectively makes the Preview tab a duplicate of the Changes tab.

### Direction C: Mode toggle (overview / split / unified)

**Core idea.** Offer three modes at the top of the tab:
- **Overview** — change-summary dashboard (counts per page, flagged items, link to each changed page).
- **Unified** — Direction A: one browser, inline change markers.
- **Split** — today's behaviour: two mirrored browsers, preserved for when someone really wants it.

Modes are toggles that re-render via query string (`?view=overview|unified|split`); default is Overview for initial imports (most pages are all-new — a dashboard reads better than walls of panels), Unified otherwise.

**"What needs my attention?"** Overview mode is built for exactly this question. Unified mode carries it inline.

**"How do I understand this change?"** Unified mode is the primary answer. Split remains as an escape hatch for reviewers used to it.

**Shape.** A `mode` prop on a new `SpecDiffView` composition that picks between three sub-components. Two of them (Unified, Split) reuse existing code; Overview is a new compact summary.

**Tradeoffs.**
- *Pros.* Serves the wide range of PR shapes (initial imports, small tweaks, bulk refactors) with a mode that fits each. Keeps Split mode so we don't lose the current capability during the transition.
- *Cons.* More surface to build and test. Three modes is two too many if reviewers only ever use one in practice; risks being "clever." Mode discovery cost (will users find the toggle?).

## Recommendation: Direction A with a graceful default, Direction C's Overview as a header summary

Build **Direction A** (Unified annotated view) as the Preview tab's body. At the top of the tab, render a compact overview strip borrowed from Direction C: change counts by category, a jump-list of pages with changes. Do not build Split mode as a toggle — if a reviewer truly needs raw base-side browsing, they can open the base ref in another window; the cost of the toggle (code, tests, discoverability) is not worth the marginal use.

**Why this over B or full C.**

- *The codebase values clean, not clever.* One view with good defaults is cleaner than three modes. A single annotated browser reads as "the form, with changes shown in place" — the mental model is immediate.
- *The initial-import case is the common case right now.* Direction B fails on it. Direction A handles it: every page opens, every panel carries a `+ New` badge, the reviewer walks the form once top-to-bottom the same way they would walk the final artifact.
- *The small-refinement case is handled equally well.* Unchanged pages collapse to "3 unchanged pages — show," and the reviewer clicks directly into the one page that changed.
- *Reuse.* `flex-spec-browser` already renders the right structure; the diff overlay is additive. No need for a parallel component hierarchy.

The same component serves both cases. The behaviour differs only in how aggressively unchanged items collapse (driven by a prop or an internal heuristic: if every top-level page has a change, don't bother collapsing).

## Implementation sketch

### Component shape

Introduce `flex-spec-diff-browser` in `src/design-system/components/`. Signature:

```ts
interface SpecDiffBrowserProps {
  baseView: { dataSpec?: DataCollectionSpec; formSpec?: FormSpec }
  headView: { dataSpec: DataCollectionSpec; formSpec: FormSpec }
  changes: SpecChange[]
  /** default 'changed' when >50% of items are unchanged, else 'all' */
  revealMode?: 'changed' | 'all'
}
```

Internally:
- Build a `Map<pathKey, SpecChange[]>` keyed by page/group/field ids, so each sub-panel can ask "am I changed?"
- Reuse `PagePanel`/`GroupPanel` rendering from `flex-spec-browser`. Add a thin wrapper that:
  - Renders a `flex-change-indicator` (already exists) in the panel header when the panel or any descendant has changes.
  - For a modified/renamed field, renders a second row underneath with the before value (`strikethrough` + dim colour) for a cheap "diff peek."
  - For a removed page/group/field, renders it with the base data and a `data-removed` attribute (CSS strikes through + tints red).
  - For added items, uses `data-added` (green tint).
- `<details open>` opens panels with changes; unchanged ones stay closed, with a summary string like "Phone numbers — 4 fields, unchanged."

### Overview strip (top of tab)

A small header block above the browser:
- Counts: `12 added · 3 modified · 1 removed`
- Jump-list: "Pages with changes: *Personal info*, *Military service*, *Signature*" — each is an `href="#page-<id>"`.

### Route changes

`components.tsx`: replace the two-column `compare__preview` block with the single `<SpecDiffBrowser>` call. All the data it needs is already resolved upstream (`baseView`, `headView`, `changes`). Drop the `compare__preview-side-*` styles (or keep them as dead code to remove in a follow-up).

Nothing in `src/services/forms/comparison/` needs to change — the existing `SpecChange` path format is sufficient for the "am I changed?" lookup.

### Effort estimate

- New component + styles: ~3 hours
- Wiring into the compare route + removing old Preview markup: ~1 hour
- Tests (render with empty base, initial-import, small-change, all-removed): ~2 hours
- Conformance / visual snapshot entry: ~1 hour

Roughly **half a day to a day**, done as a single PR.

## Edge cases

| Case | Behaviour |
|---|---|
| No changes at all | Empty-state: "These refs are identical." (Reuses `flex-semantic-diff` empty state wording.) |
| Initial import (base has no specs) | Every page/group/field shows `+ New` badge. Overview strip reads "N items added." No collapse — everything opens. Component renders cleanly because we already synthesize empty base specs in the route. |
| 100+ changes | Overview strip still summarises; the browser scrolls. Still readable because unchanged items collapse. Consider a "jump to next change" keyboard shortcut as a follow-up if load testing reveals the need. |
| Structural-only change (page reordered) | Moved page gets a `↕ Moved` badge in the header; the position numbers in the panel header (`1.`, `2.`) reflect the head order, and the badge shows "was position 3." |
| Removed page/group/field | Renders from base data with `data-removed` styling. Not deceptive: the panel number matches its original base position, and a "Removed" badge is prominent. |
| Rename ambiguity | We already treat ID as identity, so a rename is just a `title` change on the same `id`. Shown inline: "Phone number" with "(was: Telephone)" underneath. |

## Out of scope for this pass

- Inline field-level editing from the review page (story 4 affordance; review should stay read-only).
- Threaded comments anchored to specific diff rows (Comments tab stays flat for now).
- Keyboard shortcuts for change-to-change navigation (`j`/`k`). Valuable, but defer until the annotated view is proven.
- A true split-mode toggle. If reviewers genuinely need base-side full browsing, we'll add it later — we aren't losing the capability, just changing the default.
- A minimap / overview scrollbar. The top-of-tab overview strip should cover this need.
- Condition-reference reachability ("this removed field is referenced by condition X"). Important for safety, but belongs in the comparison service as a new `SpecChange` category (e.g., `broken-reference`) rather than in the view.
- Performance work for projects with thousands of fields. The current tree walk is O(pages × groups × fields); a form that big would need pagination or virtualisation, and is not in scope.
