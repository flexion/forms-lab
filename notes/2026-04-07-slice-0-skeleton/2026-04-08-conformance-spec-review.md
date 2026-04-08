# Conformance Spec Approach — Review After Full Implementation

**Date:** 2026-04-08
**Status:** Pending review after Specs 2-5

## Context

We implemented a conformance-spec.ts approach where each component declares its USWDS mapping, fixtures, verified properties, intentional differences, and behavioral expectations. This spec serves as the source of truth for both conformance tests and catalog documentation.

The initial implementation uses explicit fixture pairs (USWDS HTML + flex HTML per variant). We considered a matrix approach that would generate combinations from orthogonal axes (variant × size × state), reducing duplication. We deferred the matrix approach because:

1. We haven't proven it against complex components (accordion, modal, date picker)
2. Template interpolation for components with non-trivial HTML structure adds complexity
3. The assembly logic (USWDS classes vs flex data attributes) needs to handle edge cases we haven't encountered yet
4. Debugging test failures is harder when HTML is generated rather than explicit

## Review checklist (after all 48 components)

- [ ] Did the explicit fixture approach cause excessive duplication?
- [ ] Were there components where a matrix would have been significantly simpler?
- [ ] Did we encounter components where the spec format didn't fit well?
- [ ] Is the catalog rendering of the spec useful to designers/developers?
- [ ] Are there properties we're ignoring that we shouldn't be?
- [ ] Should behavioral specs drive automated tests, or is documentation sufficient?
- [ ] Is the generic test runner simple enough to understand and debug?

## Decision

If duplication is a real problem, refactor to matrix approach. If the explicit approach works well enough across 48 components, keep it simple.
