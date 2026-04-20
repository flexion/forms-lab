---
issue: 4
title: Maya shapes the form experience
milestone: "Final Project"
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As a **form creator (Maya)**, in order to **control how applicants experience the form**, I want **to shape the form structure using natural language and manual controls, with a live preview of my changes**

## Preconditions:

- A FormProject exists with extracted DataCollectionSpec and FormSpec (Slice 2)
- Maya is authenticated

## Acceptance Criteria:

- [ ] Maya can view the current FormSpec for a project
- [ ] Maya can describe changes in natural language (e.g., "add an eligibility screener before page 5")
- [ ] LLM proposes concrete FormSpec edits based on Maya's intent and the underlying DataCollectionSpec
- [ ] Maya sees a clear before/after of proposed changes
- [ ] Maya can accept or reject proposed changes
- [ ] Maya can manually fine-tune: reorder pages, move groups between pages, set delivery mode per section
- [ ] LLM suggests delivery modes based on section complexity
- [ ] Live preview shows what Carlos would see
- [ ] Changes are saved to the FormSpec

## Success Metrics:

- Maya can complete a form shaping session in under 10 minutes
- LLM-assisted edits align with Maya's stated intent
- LLM delivery mode suggestions align with section complexity

## Notes:

- LLM-assisted authoring is the primary workflow; manual controls are for fine-tuning
- Story 5 handles proposal/draft semantics — Story 4 edits FormSpec directly
- Live preview renders the form as Carlos would see it
- FormSpec changes are persisted via existing ProjectStore

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable
