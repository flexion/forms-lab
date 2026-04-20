# Presentation Design Spec

## Overview

A server-rendered slide deck at `/presentation` within the Hono app. Dark theme, keyboard-navigated, projector-optimized. 15 minutes total: ~8 min slides, ~6 min live demo, ~1 min buffer.

## Narrative Arc

### Act 1: The Problem & Thesis (2 min, 3 slides)

**Slide 1 — Title**
- "Forms Lab: LLM-Assisted Forms Platform"
- Daniel Naab
- Subtitle: a one-sentence thesis

**Slide 2 — The Problem**
- Government forms are complex (hundreds of fields, conditional logic, sensitivity)
- Manual digitization is expensive and error-prone
- 10x Forms Platform exists — extraction is the bottleneck
- Visual: example of a SNAP form page (screenshot or wireframe)

**Slide 3 — The Thesis**
- Separate "what to collect" (DataCollectionSpec) from "how to present" (FormSpec)
- Let LLMs handle extraction, shaping, and evaluation behind well-defined interfaces
- Build a systematic way to compare approaches (not just "use GPT")
- Visual: simple diagram showing the separation

### Act 2: How I Built It (4 min, 5 slides)

**Slide 4 — Architecture**
- Three-tier data model: DataCollectionSpec → FormSpec → Submission
- Service layer with one-way dependency flow
- Visual: layer diagram (shared → services → entrypoints)

**Slide 5 — Development Process**
- Claude Code as development collaborator
- Catalog as shared context: personas, stories, architecture, decisions
- Session lifecycle: /start-story → /finish-story
- Key insight: time invested in structure made the LLM integrations plug in cleanly
- Visual: catalog screenshot or structure diagram

**Slide 6 — LLM Integration Points**
- Four distinct integration surfaces:
  - Extraction: PDF → structured fields (10 variants)
  - Shaping: natural language → form edit commands (tool-use)
  - Filling: conversational completion (agent with tools)
  - Evaluation: LLM-as-judge scoring (harness + metrics)
- Visual: integration map (boxes/arrows showing where LLMs sit)

**Slide 7 — Experimentation Framework**
- Strategy pattern + variant registry
- Evaluation harness with deterministic + LLM-as-judge scoring
- Metrics: recall, precision, type accuracy, sensitivity accuracy
- Variant picker lets users toggle implementations at runtime
- Visual: table or chart of variant results

**Slide 8 — Key Finding**
- hybrid-v1 Pareto-dominates all prompt-only variants
- Prompt shape > few-shot > verbose instructions
- Tool-use trades recall for precision + sensitivity
- RAG grounding: +25pp sensitivity accuracy
- Visual: results comparison (small table or bar chart)

### Act 3: Live Demo (6 min)

**Demo Flow:**
1. Open Wisconsin SNAP form in the app
2. Show extraction with variant picker — toggle between implementations
3. Show evaluation scores for different variants
4. Shape the form via chat — demonstrate command-based editing
5. Show the catalog briefly (persona structure, Claude Code context)
6. Show deployed infrastructure (branch apps)

**Transition:** Period key blanks the slide deck; switch to app tabs already open.

### Close (30 sec, 1 slide)

**Slide 9 — What's Next**
- RAG authoring pipeline: forms generated from policy corpus
- Conversational filling maturity
- Cost optimization: path from flagship models to smaller/local
- The framework makes each step an experiment, not a rewrite

## Technical Implementation

### Route

`/presentation` — single route that renders the complete deck.

### File Structure

```
src/entrypoints/app/routes/presentation/
├── index.tsx          # Route handler, renders shell + all slides
├── slides.tsx         # Slide component array + individual slide components
├── presentation.css   # Dark theme, slide layout, transitions
└── client.ts          # Keyboard nav script (authored separately, inlined at render)
```

### Content Model

Each slide is a JSX component returning a `<section>` element. A single exported array defines deck order:

```tsx
export const slides = [
  TitleSlide,
  ProblemSlide,
  ThesisSlide,
  ArchitectureSlide,
  DevelopmentProcessSlide,
  IntegrationPointsSlide,
  ExperimentationSlide,
  KeyFindingSlide,
  WhatsNextSlide,
]
```

### Client Behavior

Inline script (~30 lines, no dependencies):
- All slides rendered as `<section>` elements with `data-slide` index
- Only `.active` section is visible (CSS `display: none` / `display: flex`)
- Left/Right arrows navigate
- URL hash updates (`#3`) for deep-linking
- Period key blanks screen (CSS class toggle on body)
- Escape shows grid overview (optional, lower priority)

### Styling

Dark presentation theme, scoped to the `/presentation` route:

- Background: `#0d1117`
- Primary text: `#e6edf3`
- Accent colors: drawn from existing `--flex-*` token palette
- Font size: 2rem+ for body text, 3-4rem for headings
- Max 4 bullets per slide
- Diagrams: inline SVG (hand-drawn or simple geometric)
- Full viewport height per slide, centered content
- No visible chrome (no nav bar, no footer)

### Presentation Principles

- Max 5-7 words per bullet point — you talk, slides anchor
- One idea per slide — no scrolling, no wall of text
- Diagrams over text wherever possible
- Slide content supports the speaker, doesn't replace them
- Every slide should be parseable in 3 seconds

### Dependencies

None new. Uses:
- Existing Hono JSX rendering
- Existing CSS build pipeline (presentation.css added to bundle or inlined)
- Existing `serveStatic` for any screenshot assets

### Demo Preparation

Pre-opened browser tabs for the demo:
1. SNAP form project page (extraction view with variant picker)
2. Evaluation results page
3. Form shaping chat interface
4. Catalog index page
5. Deployment dashboard (branch apps)

Period key on the deck → switch to pre-staged tabs.
