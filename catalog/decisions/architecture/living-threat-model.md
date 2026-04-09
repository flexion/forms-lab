---
status: stable
tags: [architecture, security, process]
decided: 2026-04-09
---

# Living Threat Model

Maintain a trust-boundary and data-flow threat model as a living architecture document, updated as part of each story's definition of done.

## Context

Forms Lab handles government form data including user-submitted PII, integrates with external services (Claude API, GitHub OAuth), and deploys via an automated webhook pipeline. As the system grows, each new story may introduce trust boundary crossings or data flows with security implications. Without a structured way to track these, security considerations get lost or addressed inconsistently.

Flexion's standard definition of done already includes "Threat model updated" as a checklist item, but the project had no threat model to update.

## Decision

We maintain a threat model in `catalog/architecture/threat-model.md` using trust boundary and data flow analysis. Each trust boundary in the system gets a section documenting what data crosses it, what could go wrong, current mitigations, and residual risk. A risk summary table provides a scannable overview.

The threat model is kept current through two mechanisms:

1. **Definition of done** -- every story includes a "Threat model updated" checkpoint, prompting developers to consider whether the story changes any trust boundaries or data flows.
2. **Claude command** -- a project-local `/review-threat-model` command that reads the current threat model and the branch diff, then identifies whether updates are needed.

We chose trust boundary / data flow analysis over STRIDE (too formulaic for this project's size) and a standalone risk register (documents conclusions without analytical structure). The approach produces a document that reads naturally alongside the existing system overview and data model docs.

## Alternatives considered

- **STRIDE per component** -- systematically walk each component through six threat categories. Thorough but produces a large matrix with many N/A cells. Maintenance burden grows proportionally with components.
- **Lightweight risk register** -- a flat table of threats, likelihood, impact, mitigations. Compact but lacks analytical framework. Easy to miss threats because there's no systematic identification process.
- **No formal threat model** -- rely on ad-hoc security review. Doesn't scale, no shared understanding of the system's security posture.

## Consequences

- Developers can identify security implications of proposed changes by consulting a single document
- The threat model evolves with the architecture rather than becoming stale
- Adds a small overhead to each story's completion (reviewing the threat model checkpoint)
- The document structure mirrors the system architecture, making it intuitive to navigate
- Non-data-flow threats (supply chain, DoS) are captured in a separate section to avoid gaps

## Sources

- [System overview](../../architecture/system-overview.md)
- [Flexion security-compliance skill](https://github.com/flexion/flexion-ai-security-compliance) -- data flow tracing, logging hygiene patterns
- Flexion user story template -- standard DoD includes "Threat model updated"
