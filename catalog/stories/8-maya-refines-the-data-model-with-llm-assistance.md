---
issue: 8
title: Maya refines the data model with LLM assistance
milestone: "Final Project"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As a **form creator (Maya)**, in order to **improve the extracted specs without editing JSON**, I want **to describe changes in natural language and have the system update the DataCollectionSpec accordingly**

## Preconditions:

- A FormProject with DataCollectionSpec exists (Slice 2+)
- Maya is authenticated
- Comparison UI available (Slice 4)

## Acceptance Criteria:

- [ ] Maya can describe a change in natural language (e.g., "add a phone number field to the contact section")
- [ ] LLM interprets the request and modifies the DataCollectionSpec via tool calls
- [ ] Changes are presented as a proposal using the comparison UI from Slice 4
- [ ] Maya can review the semantic diff before accepting
- [ ] Maya can accept or reject each proposed change
- [ ] Accepted changes update the spec; rejected changes are discarded
- [ ] Multiple refinement rounds supported in a single session

## Success Metrics:

- Percentage of natural language requests correctly interpreted on first attempt
- Average refinement rounds needed to achieve desired spec state

## Notes:

- LLM uses tool calls: `add_field`, `remove_field`, `update_field`, `move_field`, `set_condition`, etc.
- Tool calls produce auditable changes (each maps to a spec modification)
- Reuses comparison protocol from Slice 4 for review
- This is the authoring agent pattern from the design spec

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] Tool call interface defined and implemented
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable
