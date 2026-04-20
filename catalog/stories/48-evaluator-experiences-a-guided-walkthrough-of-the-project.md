---
issue: 48
title: Evaluator experiences a guided walkthrough of the project
milestone: ""
labels: [user-story]
state: closed
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As an **evaluator**, in order to **understand the project's scope, technical depth, and LLM integration quickly**, I want **a guided walkthrough of the Forms Lab project that tells a clear narrative -- whether during a live 15-minute presentation or reviewing asynchronously at my own pace**

## Preconditions:

- Project deployed and accessible via web
- Catalog content (personas, stories, architecture, experiments) exists

## Acceptance Criteria:

- [ ] A walkthrough exists as a catalog content type -- a sequence of markdown pages in `catalog/walkthrough/` with frontmatter defining order, title, and rubric coverage tags
- [ ] Visiting `/catalog/walkthrough` shows an index of the walkthrough with section titles, estimated timing, and a "Start" entry point
- [ ] Each walkthrough page renders with prev/next navigation and a progress indicator (e.g., "3 of 8")
- [ ] A `?present` query parameter switches to presentation mode: focused typography, minimal chrome, larger text, no catalog sidebar -- optimized for projecting on a screen
- [ ] In either mode, walkthrough pages can link to any catalog resource (personas, architecture, decisions, experiments), live forms, or external URLs (GitHub PRs, issues). Links open in context in normal mode; in present mode they open in new tabs to preserve presentation flow
- [ ] Each walkthrough page's frontmatter declares which rubric areas it addresses (e.g., `rubric: [model-functionality, innovation]`), enabling coverage tracking
- [ ] The walkthrough content is maintainable as a living artifact: adding a page means adding a markdown file with the right frontmatter; reordering means changing the `order` field; no code changes required for content updates
- [ ] The walkthrough tells a coherent story suitable for a 15-minute presentation, covering at minimum: problem space, technical approach, LLM integration and evaluation, production environment, inference pipeline, and live demo
- [ ] Initial walkthrough content is populated covering the project as built to date

## Success Metrics:

- Walkthrough covers all six rubric sub-areas (model-functionality, innovation, environment-setup, inference-pipeline, technical-documentation, demo-presentation)
- Total timing sums to ~15 minutes
- Evaluator can navigate from walkthrough to any relevant catalog resource within one click

## Notes:

- Design spec: `notes/2026-04-13-walkthrough-presentation/design.md`
- Rubric: `notes/final-project-rubric.md`
- Dual rendering mode: normal (catalog-integrated) and present (focused, minimal chrome, keyboard nav)
- Living artifact -- updated incrementally as stories ship; part of definition of done for presentation-worthy work
- Audiences: instructor/peers (primary), Code for America Summit and general interest (secondary)

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Walkthrough index shows rubric coverage summary
- [ ] Present mode works with keyboard navigation (arrow keys advance pages)
- [ ] Initial content covers project as built to date
- [ ] Tests pass
- [ ] Type checking passes
- [ ] Deployed and demoable