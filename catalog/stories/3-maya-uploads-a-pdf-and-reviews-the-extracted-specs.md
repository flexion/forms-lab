---
issue: 3
title: Maya uploads a PDF and reviews the extracted specs
milestone: "Final Project"
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As a **form creator (Maya)**, in order to **digitize a paper form without technical skills**, I want **to upload a PDF form and review the structured specs the system extracted from it**

## Preconditions:

- Maya is authenticated (Slice 1)
- PDF form available for upload

## Acceptance Criteria:

- [x] Upload page accepts PDF files
- [x] System extracts structure from PDF and produces a DataCollectionSpec
- [x] System generates a default FormSpec based on the extracted DataCollectionSpec
- [x] Both specs are displayed in the catalog as browsable, reviewable content
- [x] Maya can see what fields were extracted, their types, grouping, and conditions
- [x] Maya can see the proposed form layout (pages, sections, delivery modes)
- [x] Extracted specs are persisted as a FormProject in git
- [x] Extraction errors or low-confidence fields are flagged for review
- [x] Form projects are stored as bare git repos with version history
- [x] Project detail page shows version history with commit-level snapshots
- [x] Projects are publicly viewable at user-scoped URLs (/:owner/:slug)
- [x] Mutations (delete, re-extract) are restricted to project owners via service-layer permission checks
- [x] Authenticated users can fork projects they do not own
- [x] User profile pages list a user's projects at /:owner
- [x] Git repository browsing (tree, blob, commits) available at GitHub-style URLs
- [x] Read-only git clone served over HTTP
- [x] Home page shows dashboard for authenticated users, landing page for anonymous visitors

## Success Metrics:

- Extraction accuracy: percentage of fields correctly identified vs. source PDF
- Time from upload to reviewable spec < 30 seconds
- Establish baseline evaluation metrics for LLM extraction quality

## Notes:

- **First LLM integration point** — uses Claude API (Opus/Sonnet baseline)
- LLM service uses strategy pattern: `PdfExtractor` interface with `ApiPdfExtractor` implementation
- Evaluation: compare extracted spec against manually-created ground truth for test PDFs
- Future experiments: alternative models, prompting strategies, chunking approaches
- Form projects stored as bare git repos at `data/repos/<slug>.git`
- ProjectService layer enforces ownership permissions; route handlers are thin wrappers
- GitHub-style URL structure: `/:owner/:slug`, `/:owner/:slug/tree/:ref/*`, `/:owner/:slug/settings`, etc.

## Definition of Done:

- [x] Acceptance criteria met
- [x] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [x] Technical documentation updated -- architecture docs and decisions are current
- [x] LLM extraction service has interface abstraction (swappable implementations)
- [x] At least one test PDF with ground truth for evaluation
- [x] Tests pass
- [x] Type checking passes
- [x] CI pipeline green
- [x] Deployed and demoable