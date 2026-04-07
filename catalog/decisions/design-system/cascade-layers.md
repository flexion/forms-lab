---
status: stable
tags: [design-system, css, specificity]
decided: 2026-04-07
---

# CSS @layer for Deterministic Specificity Management

Use CSS cascade layers to establish a fixed, explicit ordering for all styles, eliminating specificity conflicts as a class of bug.

## Context

CSS specificity conflicts are one of the most common sources of design system bugs — a component style overrides a base style unexpectedly, or a utility class can't override a block style without `!important`. In a system layering reset, tokens, base styles, components, and utilities, the order of these concerns must be reliable and enforceable rather than dependent on selector authoring discipline.

## Decision

All CSS in the design system is organized into six named layers declared in strict order: `reset → tokens → composition → base → block → utility`. Styles in later layers always win over styles in earlier layers regardless of selector specificity, because cascade layer order is the dominant factor. All CSS must be placed in one of these layers — styles outside a layer would have highest priority and break the model.

## Alternatives considered

- **BEM naming conventions** — Establishes naming discipline that implies specificity intent, but relies entirely on developer discipline. Any deviation causes conflicts, and BEM doesn't prevent specificity escalation from combinators.
- **CSS Modules** — Scopes styles by component via generated class names, eliminating global conflicts. Adds a build step and tightly couples CSS to JavaScript module boundaries, which doesn't fit a server-rendered design system.
- **Tailwind CSS** — Utility-first approach with a strong specificity model, but conflicts with USWDS's block-based component model and would require rewriting rather than adapting proven USWDS patterns.

## Consequences

- Specificity is deterministic: where a rule lives determines when it wins, not how many selectors it uses
- `!important` is not needed and its absence is a signal that the layer structure is working correctly
- All CSS must be in a layer — ungrouped styles would silently take highest priority and break the model
- The six-layer model is documented and must be understood by anyone adding CSS to the system

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
