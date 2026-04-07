---
status: stable
tags: [design-system, tokens, theming]
decided: 2026-04-07
---

# Two-Tier Token Architecture: Palette and Semantic Layers

Structure CSS custom properties into two distinct layers — an immutable USWDS palette layer and a role-based semantic layer — to enable theming without touching component styles.

## Context

A government-facing design system needs USWDS visual conformance while remaining independently maintainable and themeable. Using USWDS color values directly in components would make theming require touching every component. A single flat namespace of custom properties provides no convention for distinguishing raw values from meaningful roles.

## Decision

The token architecture has two tiers. The palette layer contains approximately 140 custom properties drawn directly from USWDS 3.13 color definitions — these represent every color in the USWDS palette and are never used directly in component styles. The semantic layer maps roles (e.g., `--color-text-primary`, `--color-surface-base`) onto palette values. All component styling references only semantic tokens. Retheming means remapping semantic tokens to different palette entries; component CSS is untouched.

## Alternatives considered

- **Single-tier tokens** — One flat set of custom properties used directly in components. Simpler to define, but harder to theme consistently — every component would need individual updates for a theme change.
- **Unstructured custom properties** — Ad hoc `--color-*` variables added as needed without a defined architecture. Grows inconsistently, makes theming unpredictable, and provides no contract between the token layer and components.

## Consequences

- Dark mode and alternate themes can be implemented by overriding semantic tokens only, with no changes to component CSS
- USWDS visual conformance is maintained through the palette layer, which mirrors USWDS 3.13 values
- The token file is approximately 84KB — a known cost accepted for the theming flexibility it provides
- Developers must use semantic tokens in component styles; direct use of palette tokens is a convention violation

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
