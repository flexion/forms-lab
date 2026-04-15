---
issue: 3
title: Maya uploads a PDF and reviews the extracted specs
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-14T00:31:42.550Z
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
- [ ] Maya can see the proposed form layout (pages, sections, delivery modes)
- [ ] Extracted specs are persisted as a FormProject in git
- [x] Extraction errors or low-confidence fields are flagged for review

## Success Metrics:

- Extraction accuracy: percentage of fields correctly identified vs. source PDF
- Time from upload to reviewable spec < 30 seconds
- Establish baseline evaluation metrics for LLM extraction quality

## Notes:

- **First LLM integration point** — uses Claude API (Opus/Sonnet baseline)
- LLM service uses strategy pattern: `PdfExtractor` interface with `ApiPdfExtractor` implementation
- Evaluation: compare extracted spec against manually-created ground truth for test PDFs
- Future experiments: alternative models, prompting strategies, chunking approaches
- FormProject created on upload: `projects/<slug>/spec.json`, `projects/<slug>/form.json`, `projects/<slug>/source.pdf`

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [x] LLM extraction service has interface abstraction (swappable implementations)
- [x] At least one test PDF with ground truth for evaluation
- [x] Tests pass
- [x] Type checking passes
- [x] CI pipeline green
- [x] Deployed and demoable