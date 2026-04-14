# Walkthrough Presentation Design

## User Story

**As an evaluator**, I want a guided walkthrough of the Forms Lab project so that I can understand the project's scope, technical depth, and LLM integration in a clear narrative -- whether during a live 15-minute presentation or reviewing asynchronously at my own pace.

## Acceptance Criteria

1. A walkthrough exists as a catalog content type -- a sequence of markdown pages in `catalog/walkthrough/` with frontmatter defining order, title, and rubric coverage tags.

2. Visiting `/catalog/walkthrough` shows an index of the walkthrough with section titles, estimated timing, and a "Start" entry point.

3. Each walkthrough page renders with prev/next navigation and a progress indicator (e.g., "3 of 8").

4. A `?present` query parameter switches to presentation mode: focused typography, minimal chrome, larger text, no catalog sidebar -- optimized for projecting on a screen.

5. In either mode, walkthrough pages can link to any catalog resource (personas, architecture, decisions, experiments), live forms, or external URLs (GitHub PRs, issues). These links open in context in normal mode; in present mode they open as overlays or new tabs to preserve presentation flow.

6. Each walkthrough page's frontmatter declares which rubric areas it addresses (e.g., `rubric: [model-functionality, innovation]`), enabling coverage tracking -- so you can see at a glance which rubric criteria are demonstrated and which have gaps.

7. The walkthrough content is maintainable as a living artifact: adding a page means adding a markdown file with the right frontmatter; reordering means changing the `order` field; no code changes required for content updates.

8. The walkthrough tells a coherent story suitable for a 15-minute presentation, covering at minimum: problem space, technical approach, LLM integration and evaluation, production environment, inference pipeline, and live demo.

9. Initial walkthrough content is populated covering the project as built to date.

## Content Model

Each walkthrough page is a markdown file in `catalog/walkthrough/` with frontmatter:

```yaml
---
title: "LLM-Assisted Extraction"
order: 3
rubric:
  - model-functionality
  - innovation
timing: "3 min"
audience:
  - evaluator
  - general
---
```

### Rubric Values

Map to the six rubric sub-areas from `notes/final-project-rubric.md`:

- `model-functionality`
- `innovation`
- `environment-setup`
- `inference-pipeline`
- `technical-documentation`
- `demo-presentation`

### Audience Values

- `evaluator` -- instructor and peers in the LLM class
- `general` -- broader audience (e.g., Code for America Summit)

### Timing

Advisory field for pacing the 15-minute presentation. The walkthrough index aggregates timing to show total duration.

## Suggested Initial Section Sequence

| Order | Title | Rubric Focus | Timing |
|---|---|---|---|
| 1 | The Problem | -- | 1 min |
| 2 | Our Approach | innovation | 2 min |
| 3 | LLM-Assisted Extraction | model-functionality, innovation | 3 min |
| 4 | Evaluation & Experimentation | model-functionality | 3 min |
| 5 | Production Infrastructure | environment-setup | 2 min |
| 6 | Inference Pipeline | inference-pipeline | 2 min |
| 7 | Live Demo | demo-presentation | 2 min |
| 8 | What's Next | -- | 1 min |

Sections 3 and 4 (LLM work) receive 6 of 15 minutes -- 40% of the time, matching the 40% rubric weight. Sections 5-6 (production/pipeline) receive ~27%, matching the 30% rubric weight. The `technical-documentation` rubric area is addressed by the catalog as a whole; the walkthrough links into the catalog, and its existence demonstrates the documentation system.

This sequence will evolve as features land.

## Rendering Design

### Two Rendering Modes

Both modes render the same markdown content. The difference is chrome and typography.

**Normal mode** (`/catalog/walkthrough` and `/catalog/walkthrough/:slug`):

- Renders within the existing catalog layout (header, navigation, breadcrumbs)
- Walkthrough index page shows the section list with titles, timing, rubric badges, and a "Start" link
- Individual pages show rendered markdown with prev/next navigation and progress indicator ("3 of 8")
- Links behave normally -- inline navigation
- The walkthrough feels like a curated path through the catalog

**Present mode** (`/catalog/walkthrough/:slug?present`):

- Minimal chrome: no catalog header, no sidebar, no breadcrumbs
- Focused typography: larger base font, generous whitespace, constrained content width for readability on a projector
- Prev/next navigation remains, styled subtly (bottom of viewport or keyboard-driven)
- Progress indicator remains (subtle, e.g., bottom bar or "3/8" in corner)
- Links to catalog resources and forms open in new tabs to preserve presentation flow
- Keyboard navigation: arrow keys or spacebar advance pages

### Shared Between Modes

- Same markdown rendering pipeline (the catalog already does this)
- Same prev/next navigation component (styled differently per mode)
- Same progress indicator component (positioned differently per mode)
- Same frontmatter parsing

### New Components

- Walkthrough index page (list of sections with metadata)
- Walkthrough page navigation (prev/next + progress)
- Present-mode layout wrapper (minimal chrome, focused typography)

Content rendering uses the catalog's existing markdown pipeline. The design system's existing components (badges for rubric tags, cards for the index) cover the UI needs.

## Rubric Coverage Tracking

The walkthrough index page aggregates rubric tags from all walkthrough pages and displays a coverage summary -- which rubric areas are addressed and which have gaps. This provides a dashboard view of presentation readiness at any point during development.

## Integration with Definition of Done

The walkthrough is a living artifact. When a story delivers a capability that the presentation needs to showcase, updating the relevant walkthrough page (or adding a new one) is part of that story's definition of done. The rubric coverage metadata makes gaps visible, preventing last-minute scrambles.

## Persona Targeting

The walkthrough frontmatter includes `audience` tags. The initial implementation shows all pages for all viewers. The metadata supports future filtering (e.g., a shorter "Code for America" version that skips rubric-heavy sections). For now, the full sequence serves all audiences; the presenter adjusts emphasis verbally depending on context.

## Interlinking Pattern

Walkthrough pages use standard markdown links to catalog resources, live forms, and external URLs. A page about extraction links to `../experiments/pdf-field-extraction/_suite.md` and to the live form at `/forms/pardon-application`. In normal mode these navigate inline. In present mode they open in new tabs to preserve flow.

## Key Design Decisions

- **Catalog content type, not standalone route:** The walkthrough lives in the catalog because the evaluator persona already expects the catalog to serve them. This makes the walkthrough discoverable alongside other catalog content and naturally interlinked.
- **Dual rendering mode:** Same content, two views. Normal mode for browsing and grading; present mode for live presentation. The instructor can switch between them.
- **Markdown-driven:** Content changes require only markdown edits, no code changes. This keeps the walkthrough maintainable as a living artifact.
- **Rubric-aware frontmatter:** Makes coverage gaps visible during development and demonstrates systematic project management to the evaluator.
