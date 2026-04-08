# USWDS Design System Specs 2-3: Remaining Components

**Date:** 2026-04-08
**Status:** Approved
**Story:** flexion/forms-lab#1
**Branch:** `slice-0/skeleton`

## Overview

Complete the USWDS design system with 39 components + 2 documentation entries across two specs. Spec 1 established the infrastructure and proved the pattern with 8 components. This design covers everything else.

**Spec 2:** 25 CSS-only components + 2 documentation-only entries + dogfooding integration
**Spec 3:** 14 interactive components (custom elements with client.ts) + dogfooding integration

Checkpoint review between specs to assess the conformance-spec approach at scale.

## Spec 2: CSS-Only Components (25 + 2 docs)

### Content Display

**flex-tag** — USWDS tag component
- Variants: `data-size="big"`
- Replaces: flex-badge (StatusBadge) throughout the catalog
- USWDS ref: https://designsystem.digital.gov/components/tag/

**flex-link** — styled anchor element
- External link icon pattern (icon after link text for external URLs)
- Visited state styling
- USWDS ref: https://designsystem.digital.gov/components/link/

**flex-list** — ordered and unordered lists
- USWDS spacing and typography
- Unstyled variant
- USWDS ref: https://designsystem.digital.gov/components/list/

**flex-card** — upgrade existing flex-card to full USWDS conformance
- Variants: default, flag (horizontal), header-first, media, media-right
- Modifiers: inset media, exdent (media/body/footer/header)
- Replaces: current ContentCard component
- USWDS ref: https://designsystem.digital.gov/components/card/

**flex-collection** — structured item list with metadata
- Variants: default, condensed (`data-variant="condensed"`)
- Items have: heading, description, date, tags
- USWDS ref: https://designsystem.digital.gov/components/collection/

**flex-table** — full USWDS table
- Variants: bordered (default), borderless, striped, compact, scrollable, stacked (responsive), stacked-header, sortable (CSS classes only — JS sorting in Spec 3 if needed), sticky header
- Replaces: hand-styled tables in conformance spec catalog pages
- USWDS ref: https://designsystem.digital.gov/components/table/

**flex-prose** — upgrade to exact USWDS prose conformance
- Measure (max-width), spacing, heading scale, list styling
- Our flex-prose already exists — audit against USWDS and fix differences
- USWDS ref: https://designsystem.digital.gov/components/prose/

### Navigation

**flex-breadcrumb** — hierarchical navigation trail
- Separator icon via CSS (navigate_next from sprite)
- Wrap variant (`data-variant="wrap"`)
- RDFa metadata support
- Replaces: "← Back to X" links on all detail pages
- USWDS ref: https://designsystem.digital.gov/components/breadcrumb/

**flex-side-navigation** — vertical navigation for sections
- 1-level, 2-level, 3-level nesting
- Current page indicator (`aria-current="page"`)
- Replaces: flex-catalog-sidebar custom navigation
- USWDS ref: https://designsystem.digital.gov/components/side-navigation/

**flex-footer** — page footer
- Variants: big, medium, slim
- Includes: return-to-top link, navigation links, contact info, social links, logo
- Replaces: hand-rolled site-footer in Layout
- USWDS ref: https://designsystem.digital.gov/components/footer/

**flex-search** — search form
- Variants: default, big (`data-size="big"`), small (`data-size="small"`)
- Magnifier icon in submit button
- Potential use: search on catalog design-system index
- USWDS ref: https://designsystem.digital.gov/components/search/

**flex-pagination** — page navigation
- Bounded (default) and unbounded variants
- Previous/next arrows with icons
- Current page indicator
- Potential use: stories list if many stories
- USWDS ref: https://designsystem.digital.gov/components/pagination/

### Form Structure

**flex-checkbox** — styled checkbox input
- Variants: default, tile (`data-variant="tile"`)
- States: checked, indeterminate, disabled
- Custom styling via hidden input + label + pseudo-elements
- USWDS ref: https://designsystem.digital.gov/components/checkbox/

**flex-radio** — styled radio button
- Variants: default, tile (`data-variant="tile"`)
- States: checked, disabled
- Port from class repo flex-radio with improvements
- USWDS ref: https://designsystem.digital.gov/components/radio-buttons/

**flex-select** — styled dropdown
- Multiple select variant
- Custom chevron icon via CSS mask-image
- States: disabled, error
- Port from class repo flex-select with improvements
- USWDS ref: https://designsystem.digital.gov/components/select/

**flex-button-group** — grouped buttons
- Horizontal arrangement with proper spacing
- Segmented variant
- USWDS ref: https://designsystem.digital.gov/components/button-group/

**flex-form** — form container
- Fieldset/legend pattern
- Large variant
- Proper spacing between form groups
- USWDS ref: https://designsystem.digital.gov/components/form/

**flex-validation** — validation message patterns
- Inline validation (per-field)
- Summary validation (top of form)
- USWDS ref: https://designsystem.digital.gov/components/validation/

**flex-input-prefix-suffix** — input add-ons
- Prefix (e.g., "$" before currency input)
- Suffix (e.g., "lbs" after weight input)
- Icon prefix/suffix
- USWDS ref: https://designsystem.digital.gov/components/input-prefix-suffix/

### Feedback

**flex-site-alert** — page-level alert (above content)
- Variants: info, emergency
- Modifiers: `data-slim`, `data-no-icon`, `data-no-heading`
- Distinct from flex-alert (which is in-content)
- USWDS ref: https://designsystem.digital.gov/components/site-alert/

**flex-summary-box** — bordered callout
- Heading + content
- Use: architecture docs — key takeaway callouts
- USWDS ref: https://designsystem.digital.gov/components/summary-box/

### Identity / Process

**flex-banner** — .gov/.mil domain banner
- .gov and .mil variants
- Expand/collapse for "how you know" content (minimal JS — just toggle hidden attribute, handled in client.ts)
- Flag icon, lock icon, dot-gov icon
- Replaces: nothing currently — new addition at top of every page
- USWDS ref: https://designsystem.digital.gov/components/banner/

**flex-identifier** — agency identifier
- Logo, agency name, links (required links pattern)
- Replaces: footer content area
- USWDS ref: https://designsystem.digital.gov/components/identifier/

**flex-step-indicator** — multi-step progress
- Variants: default, no-labels, counters, small-counters, centered
- Current/complete/incomplete segment states
- Use: future multi-step form filling (Slice 5)
- USWDS ref: https://designsystem.digital.gov/components/step-indicator/

**flex-process-list** — numbered steps
- Ordered step list with heading + content per step
- USWDS ref: https://designsystem.digital.gov/components/process-list/

### Documentation Only

**Typography** — catalog page documenting:
- Type scale (USWDS font-size tokens mapped to our --flex-text-* tokens)
- Line-height scale
- Font weight usage
- Measure (max-width for reading)

**Data Visualizations** — catalog page documenting:
- Accessible chart/graph guidelines from USWDS
- Color usage for data
- Alternative text requirements

### Spec 2 Dogfooding Integration

After all 25 components are implemented, apply them to the existing app:

| Component | Integration target |
|---|---|
| flex-banner | Layout — add .gov banner above header |
| flex-identifier | Layout — agency identifier in footer |
| flex-footer | Layout — replace site-footer with slim footer |
| flex-side-navigation | flex-catalog-sidebar — replace with USWDS sidenav |
| flex-breadcrumb | All detail pages (personas, decisions, architecture, stories, design-system) |
| flex-card | Catalog landing, persona list, decision list — upgrade ContentCard |
| flex-tag | Status badges, story labels, decision tags — upgrade flex-badge |
| flex-table | Conformance spec tables in design system catalog |
| flex-link | External links (USWDS docs links on component pages) |
| flex-summary-box | Architecture docs — key takeaways |
| flex-prose | Already used — verify USWDS conformance after upgrade |
| flex-search | Design system index page — component search |
| flex-button-group | Button pairs in forms (submit + cancel patterns) |

## Spec 3: Interactive Components (14)

### Light Interactive

**flex-character-count** — live character counter
- Attaches to textarea or text input
- Shows remaining characters, over-limit warning with error state
- `client.ts`: input event listener, count update, state toggle
- USWDS ref: https://designsystem.digital.gov/components/character-count/

**flex-range-slider** — styled range input
- Value display updated on input
- `client.ts`: input event listener, value display update
- USWDS ref: https://designsystem.digital.gov/components/range-slider/

**flex-memorable-date** — month/day/year fields
- Three separate inputs coordinated
- `client.ts`: validation, optional auto-advance between fields
- USWDS ref: https://designsystem.digital.gov/components/memorable-date/

### Medium Interactive

**flex-header** — USWDS site header
- Variants: basic, basic+megamenu, extended, extended+megamenu
- `client.ts`: mobile menu toggle (hamburger), nav overlay, dropdown menus, search toggle, close on escape, close on outside click
- Replaces: hand-rolled site-header in Layout
- USWDS ref: https://designsystem.digital.gov/components/header/

**flex-language-selector** — language switcher
- Two-language (toggle button) and multi-language (dropdown) variants
- `client.ts`: dropdown open/close, keyboard nav, outside-click-to-close
- USWDS ref: https://designsystem.digital.gov/components/language-selector/

**flex-in-page-navigation** — sticky sidebar TOC
- Auto-discovers headings from page content
- Scroll spy highlights current section
- `client.ts`: heading discovery, scroll listener, active state management
- Use: architecture docs
- USWDS ref: https://designsystem.digital.gov/components/in-page-navigation/

**flex-file-input** — file upload control
- Drag-and-drop zone
- File preview (images), file type display
- Multiple files, specific file types
- Error state
- `client.ts`: drag events, FileReader, preview generation, file list management
- Use: prep for Slice 2 (Maya uploads PDF)
- USWDS ref: https://designsystem.digital.gov/components/file-input/

### Heavy Interactive

**flex-combo-box** — typeahead/autocomplete select
- Filterable dropdown list from text input
- Keyboard: arrow keys to navigate, enter to select, escape to close
- ARIA combobox pattern (aria-expanded, aria-activedescendant, role=listbox)
- `client.ts`: filter logic, keyboard navigation, ARIA management, dropdown positioning
- USWDS ref: https://designsystem.digital.gov/components/combo-box/

**flex-date-picker** — calendar date selector
- Calendar popup from text input
- Month/year navigation
- Day selection with keyboard navigation within grid
- ARIA date picker pattern
- `client.ts`: calendar rendering, navigation, selection, keyboard, ARIA, positioning
- USWDS ref: https://designsystem.digital.gov/components/date-picker/

**flex-date-range-picker** — paired date pickers
- Start and end date coordination
- End date constrained to after start date
- `client.ts`: coordination between two date picker instances
- USWDS ref: https://designsystem.digital.gov/components/date-range-picker/

**flex-time-picker** — time selection combo box
- Combo box variant for time (12h/24h)
- Pre-populated time options
- `client.ts`: extends combo box pattern with time-specific logic
- USWDS ref: https://designsystem.digital.gov/components/time-picker/

**flex-modal** — dialog overlay
- Default and large (`data-size="large"`) variants
- Forced action variant (no close on backdrop click)
- Focus trap, backdrop click to close, escape to close, scroll lock, return focus on close
- ARIA dialog pattern (role=dialog, aria-modal, aria-labelledby)
- `client.ts`: focus trap, backdrop, escape, scroll lock, focus restoration
- USWDS ref: https://designsystem.digital.gov/components/modal/

**flex-tooltip** — hover/focus information popup
- Positions: top (default), bottom, left, right
- ARIA tooltip pattern (role=tooltip, aria-describedby)
- `client.ts`: show/hide on hover/focus, positioning logic, ARIA
- Use: conformance spec pages — property explanations
- USWDS ref: https://designsystem.digital.gov/components/tooltip/

**flex-input-mask** — formatted input
- Pattern-based formatting (phone, SSN, zip+4)
- `client.ts`: input formatting, cursor position management, paste handling
- USWDS ref: https://designsystem.digital.gov/components/input-mask/

### Spec 3 Dogfooding Integration

| Component | Integration target |
|---|---|
| flex-header | Layout — full USWDS header replaces hand-rolled header |
| flex-in-page-navigation | Architecture docs — auto-generated TOC |
| flex-modal | Design system catalog — "view full source" for long CSS |
| flex-tooltip | Conformance spec tables — property explanations |
| flex-file-input | Prep for Slice 2 form upload |

## Conventions (unchanged from Spec 1)

- Component scaffold: index.tsx, styles.css, client.ts, meta.ts, examples.tsx, conformance-spec.ts, conformance.test.ts
- `data-variant` for mutually exclusive visual style
- `data-size` for sizing
- `data-state` for form/interactive state
- Boolean `data-*` for orthogonal modifiers
- Internal child scoping via `__` class names
- Icons: CSS mask-image for component internals, SVG sprite `<use>` for markup icons
- Conformance specs drive both Playwright tests and catalog documentation
- Custom elements for all interactive components, bundled in dist/components.js

## Checkpoint After Spec 2

Review before starting Spec 3:
- [ ] Did conformance-spec approach scale to 33 total components?
- [ ] Any patterns to refactor before tackling complex JS components?
- [ ] Catalog design system UX with 33+ components — sidebar nav adequate?
- [ ] Font/token issues?
- [ ] Dogfooding feedback — do the components work well in real context?

## Definition of Done

### Spec 2
- [ ] 25 components implemented with conformance specs
- [ ] 2 documentation-only catalog pages (Typography, Data Visualizations)
- [ ] Dogfooding: banner, footer, sidenav, breadcrumbs, card, tag, table, link, prose, search applied to catalog
- [ ] All conformance tests pass
- [ ] All unit tests pass
- [ ] Biome and stylelint pass
- [ ] Catalog design system pages render all components with examples and conformance docs

### Spec 3
- [ ] 14 interactive components implemented with conformance specs and client.ts
- [ ] Dogfooding: USWDS header, in-page nav, modal, tooltip applied where appropriate
- [ ] All conformance tests pass (visual + behavioral + accessibility)
- [ ] All unit tests pass
- [ ] Keyboard navigation verified for all interactive components
- [ ] ARIA patterns verified for all interactive components
