---
status: stable
tags: [design-system, components, testing]
decided: 2026-04-07
---

# Component Scaffold Convention

Every USWDS component follows a standardized directory structure with co-located source, styles, client behavior, metadata, examples, and conformance tests.

## Context

With 48 USWDS components to implement, we needed a consistent structure that makes components self-contained and discoverable. Files that change together should live together.

## Decision

Each component lives in `src/components/flex-*/` with:
- `index.tsx` — server-rendered JSX component
- `styles.css` — CSS using --flex-* tokens, cascade layer: block
- `client.ts` — custom element for interactive behavior (optional)
- `meta.ts` — catalog metadata (name, category, USWDS reference)
- `examples.tsx` — variant examples for catalog and tests
- `conformance.test.ts` — visual + behavioral + accessibility tests

Variants use `data-variant` (mutually exclusive), sizing uses `data-size`, states use `data-state`, orthogonal modifiers use boolean `data-*` attributes. This aligns with peer web component libraries (Shoelace, Spectrum, shadcn). Internal child element scoping uses `__` in class names.

A hardcoded registry (`registry.ts`) provides type-safe component lookup. A single `register.ts` bundles all interactive client scripts into `dist/components.js`, loaded on every page via a script tag in the Layout.

## Alternatives considered

- **Auto-discovery via glob** — fragile, runtime errors from broken components, no type safety at build time
- **Separate test directory** — scatters related files across the tree, harder to maintain
- **Per-component script loading** — requires tracking which components are on each page, easy to forget

## Consequences

- Adding a component requires: create directory with files, add to registry, add CSS import to styles.css, add client import to register.ts (if interactive)
- All component details are in one directory — no hunting across the tree
- Conformance tests run via Playwright comparing against @uswds/uswds reference CSS
- The pattern scales to 48+ components without changing the architecture

## Sources

- [USWDS Components](https://designsystem.digital.gov/components/overview/)
- [Spec 1 design](../../notes/2026-04-07-slice-0-skeleton/2026-04-07-uswds-spec1-design.md)
