---
issue: 6
title: Carlos fills out a published form
milestone: "Final Project"
labels: [user-story]
state: closed
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As a **form filler (Carlos)**, in order to **apply for a government benefit**, I want **to fill out a published form and submit my responses**

## Preconditions:

- A FormProject is published with both DataCollectionSpec and FormSpec (Slices 2-4)
- Form is accessible without authentication

## Acceptance Criteria:

- [ ] Carlos can navigate to a published form
- [ ] Form renders according to the FormSpec (pages, sections, field types)
- [ ] Form validates input against DataCollectionSpec constraints (required fields, patterns, min/max)
- [ ] Carlos can navigate between pages (next/previous)
- [ ] Carlos can review all answers before submitting
- [ ] Submission is captured and linked to the specific spec version (git SHA)
- [ ] Carlos receives confirmation after successful submission
- [ ] Submission data stored as a Submission record

## Success Metrics:

- Form completion rate (started vs. submitted)
- Average time to complete
- Validation error rate per field

## Notes:

- Static delivery mode only in this slice — conversational filling is Slice 8
- Form renderer walks the FormSpec and selects UX patterns per field type
- Submission links to exact spec version so data interpretation is unambiguous
- Submission storage is in-memory or file-based for MVP (not production database)

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] Form renders all field types from the UX pattern library
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable
