---
issue: 9
title: Carlos completes complex sections through conversation
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As a **form filler (Carlos)**, in order to **navigate complex conditional sections without confusion**, I want **to complete those sections through a conversational agent that explains questions, adapts the flow, and collects my answers**

## Preconditions:

- A published form exists with at least one section marked as `conversational` delivery mode (Slice 3)
- Static form filling works (Slice 5)

## Acceptance Criteria:

- [ ] Sections marked as `conversational` in the FormSpec render as a chat interface instead of a static form
- [ ] The conversational agent asks questions in a natural order based on the DataCollectionSpec
- [ ] Agent skips irrelevant questions based on prior answers (evaluates conditions)
- [ ] Agent explains why data is needed when asked
- [ ] Agent flags sensitivity before collecting PII fields
- [ ] Collected answers are stored in the same Submission format as static form data
- [ ] Carlos can switch between conversational and static views for the same section
- [ ] Conversation state is preserved if Carlos navigates away and returns

## Success Metrics:

- Completion rate for conversational vs. static sections
- User satisfaction (qualitative feedback)
- Correctness: conversational agent collects all required fields

## Notes:

- Same DataCollectionSpec, different delivery experience — demonstrates the delivery spectrum
- Agent uses tool calls: `collect_field`, `explain_field`, `skip_section`
- CollectionState tracks: `{field_name: value | null}` for all fields in the section
- This is the filling agent pattern from the design spec

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] Filling agent has interface abstraction (swappable implementations)
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable
