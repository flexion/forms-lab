---
issue: 4
title: Maya shapes the form experience
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-14T00:31:42.550Z
---

## User Story:

As a **form creator (Maya)**, in order to **control how applicants experience the form**, I want **to reorder pages, adjust section grouping, pick delivery modes, and see a live preview of my changes**

## Preconditions:

- A FormProject exists with extracted DataCollectionSpec and FormSpec (Slice 2)
- Maya is authenticated

## Acceptance Criteria:

- [ ] Maya can view the current FormSpec for a project
- [ ] Maya can reorder pages and sections
- [ ] Maya can adjust which requirement groups appear on which pages
- [ ] Maya can select delivery mode per section (static, conversational, hybrid)
- [ ] LLM suggests delivery modes based on section complexity (e.g., "12 conditional branches — conversational recommended")
- [ ] Live preview updates as Maya edits the FormSpec
- [ ] Changes are saved as proposals (draft state), not immediately published
- [ ] Maya can discard a proposal and revert to the published version

## Success Metrics:

- Maya can complete a form shaping session in under 10 minutes
- LLM delivery mode suggestions align with section complexity

## Notes:

- Maya works in proposal/draft mode — changes don't affect the published form until reviewed (Slice 4)
- LLM integration: delivery mode recommendation based on spec analysis
- Live preview renders the form as Carlos would see it
- FormSpec changes are persisted as uncommitted changes or on a draft branch

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable
