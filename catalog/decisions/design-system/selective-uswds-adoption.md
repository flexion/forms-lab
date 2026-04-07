---
status: stable
tags: [design-system, css, uswds]
decided: 2026-04-07
---

# Selective USWDS Component Adoption with Full Fidelity per Component

Adopt USWDS 3.13 components selectively from the class repository, auditing each component fully against the spec before including it, rather than porting everything or starting from scratch.

## Context

The class repository contains 30+ implemented USWDS components, but the catalog needs only a subset of them. Including unused components adds code weight and maintenance surface. At the same time, the patterns in the class repo are proven and audited — discarding them entirely would waste that work. The goal is a clean, lean design system with high fidelity for the components it does include.

## Decision

The design system immediately includes the foundation layer: tokens, compositions, and base styles. Components are adopted on demand as features require them. Each adopted component is audited against the full USWDS 3.13 specification — all variants, states, and accessibility requirements — before being included. This ensures that every component in the system is complete and correct, not just partially ported.

## Alternatives considered

- **Port everything from the class repo** — Fast to start, but imports unused code and any existing gaps in coverage. The catalog carries weight for components it never renders.
- **Start from scratch** — Maximum control, but loses the proven patterns, token architecture, and specification work already done. Redundant effort.
- **Use USWDS directly as a dependency** — Pulls in the full USWDS package, including its Sass build pipeline, JavaScript, and all components. Heavy dependency for a project that needs selective, maintainable control over its styles.

## Consequences

- Leaner codebase — only components explicitly needed are present
- Each component is explicitly chosen and fully verified against spec before use
- Additional components can be added for future slices following the same audit pattern
- More upfront work per component, but less accumulated drift from unused or partially-correct code

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
