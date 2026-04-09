# Design System Planning — 2026-04-07

Planning notes for the comprehensive USWDS design system implementation in forms-lab.

## Decision: Comprehensive USWDS coverage

Rather than incremental component adoption, we're implementing all 48 USWDS components with full variant coverage, treating the design system as a reusable library. This ensures we've thought through all design system concerns before later implementation slices need specific components.

## Approach: Tiered specs

- **Spec 1:** Testing infrastructure + component scaffold + proof batch (button, input, alert, tag)
- **Specs 2-5:** Component batches by category (form controls, navigation, feedback, layout/content, process/identity)

Each spec follows the brainstorm → plan → implement cycle. Spec 1 validates the full component lifecycle before we scale to all 48.

## Key decisions

- Custom elements for all interactive components (`client.ts` co-located)
- `@uswds/uswds` as dev-only dependency for conformance reference fixtures
- Three test layers: unit tests, USWDS conformance fixtures, accessibility audits
- JS behavioral conformance included
- Per-component catalog pages at `/catalog/design-system/flex-*`
- Component directory: index.tsx, styles.css, client.ts, meta.ts, fixtures.ts, conformance.test.ts

## USWDS component inventory (48 total)

**Form controls (16):** Text Input, Checkbox, Radio, Select, Combo Box, Date Picker, Date Range Picker, Memorable Date, Time Picker, File Input, Range Slider, Character Count, Input Mask, Input Prefix/Suffix, Validation, Form

**Button/Action (2):** Button, Button Group

**Feedback/Status (6):** Alert, Site Alert, Summary Box, Tooltip, Modal, Validation

**Navigation (9):** Header, Footer, Side Navigation, Breadcrumb, Pagination, In-Page Navigation, Language Selector, Search, Link

**Layout/Content (11):** Card, Accordion, Collection, Table, Tag, List, Icon, Icon List, Prose, Typography, Data Visualizations

**Process/Identity (4):** Step Indicator, Process List, Banner, Identifier

## Spec 1 implementation complete

Implemented:
- Visual-descriptor library (extract + diff) ported from class repo
- Conformance test helpers (render fixtures, assertions)
- Component types, registry, register.ts, build pipeline
- Playwright configuration and CI integration
- 7 components: flex-button, flex-text-input, flex-label, flex-textarea, flex-error-message, flex-alert, flex-accordion
- Catalog design system pages with per-component views and live examples
- 28 unit tests + 18 conformance tests (Playwright) all passing

The pattern is validated — ready for Specs 2-5 (remaining 41 components).

## Sources

- [USWDS Components](https://designsystem.digital.gov/components/overview/)
- [Class repo design system](/home/daniel/src/llm-class-2026-winter-cohort/web/src/components/)
- [PR 1 design](2026-04-07-slice0-pr1-design.md)
