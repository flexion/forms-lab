---
issue: 14
title: Developer establishes and maintains a living threat model
milestone: "Final Project"
labels: [user-story]
state: open
synced_at: 2026-04-09T14:40:12.308Z
---

## User Story:

As a **developer**, in order to **understand the application's security posture and maintain it as features are added**, I want **a living threat model that documents trust boundaries and data flows, with tooling and process to keep it current**

## Preconditions:

- Skeleton complete (Slice 0)
- Deployment infrastructure design documented

## Acceptance Criteria:

- [ ] Threat model document exists in `catalog/architecture/` covering current trust boundaries and data flows
- [ ] Each trust boundary documents what data crosses it, what could go wrong, current mitigations, and residual risk
- [ ] Risk summary table provides a scannable overview of identified threats with likelihood, impact, and mitigation status
- [ ] ADR documents the decision to maintain a living threat model and the chosen methodology
- [ ] Definition of done for all stories is updated to align with Flexion's standard template, including the threat model review checkpoint
- [ ] Threat model is browsable through the catalog alongside existing architecture docs
- [ ] Claude skill exists that reviews the current threat model against branch changes and identifies whether updates are needed

## Success Metrics:

- Developers can identify the security implications of a proposed change within minutes by consulting the threat model
- Threat model updates are a routine part of story completion, not a separate effort
- New trust boundaries or data flows introduced by stories are captured in the threat model before the story is marked done

## Notes:

### Methodology:
- Trust boundary / data flow analysis — map boundaries, identify threats at each crossing
- Complements with a risk summary table for non-data-flow threats (supply chain, DoS, infrastructure access)
- Aligns with Flexion's security-compliance practices: data flow tracing, logging hygiene, secrets management

### Scope:
- This story establishes the threat model and the process to maintain it
- It does NOT implement specific mitigations — those belong to the stories that address them
- Future work could add: automated staleness detection, monitoring/alerting integration, incident response runbooks

### Trust boundaries to cover (current architecture):
- Browser <-> Caddy (TLS, request routing)
- Caddy <-> Hono application (reverse proxy)
- Hono <-> Git filesystem (spec/submission persistence)
- Hono <-> Claude API (LLM integration)
- GitHub <-> Webhook listener <-> Deploy pipeline
- Browser <-> Hono auth flow (future, Story 2)

### Definition of Done alignment:
- Current stories use a minimal DoD; Flexion's standard template includes items like threat model review, user documentation, deployment changes, and feature toggles
- This story updates all existing stories to use the aligned DoD template
- Not all items may apply to every story (e.g., feature toggles may not be relevant to this project), so adapt the template to project context

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] Threat model document reviewed for completeness against current architecture
- [ ] Claude skill tested against a sample branch diff
- [ ] All existing story definitions of done updated
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable
