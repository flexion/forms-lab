---
issue: 7
title: Maya receives a completed PDF
milestone: "Final Project"
labels: [user-story]
state: open
synced_at: 2026-04-14T00:31:42.550Z
---

## User Story:

As a **form creator (Maya)**, in order to **process applications using existing workflows**, I want **to download a completed PDF with Carlos's submission data mapped onto the original form template**

## Preconditions:

- A submission exists for a published form (Slice 5)
- Original source PDF is stored in the FormProject

## Acceptance Criteria:

- [ ] Maya can view a list of submissions for her forms
- [ ] Maya can select a submission and download a completed PDF
- [ ] The PDF maps submission data onto the original PDF form fields
- [ ] All filled fields are legible and correctly positioned
- [ ] The completed PDF is visually consistent with the original paper form

## Success Metrics:

- Field mapping accuracy: percentage of fields correctly placed in PDF
- PDF generation time < 10 seconds

## Notes:

- **Closes the PDF-in/PDF-out loop** — this is the core value proposition
- At end of Slice 6: full pipeline is complete and demoable
- PDF generation library TBD (pdf-lib, puppeteer, or similar)
- Field mapping uses DataCollectionSpec field names to locate PDF form fields

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] At least one end-to-end test: upload PDF → extract → fill → generate completed PDF
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable
