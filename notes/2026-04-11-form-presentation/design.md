# Form Presentation Design Spec

Full civic forms UX treatment for the form delivery flow. Applies GOV.UK interaction
patterns at the composition layer while keeping flex components USWDS-conformant.
Changes are sliced by form flow stage: landing, form page, review, confirmation.

## Design Decisions

- **USWDS visual language, GOV.UK interaction patterns.** The flex design system is
  USWDS-derived, so visual tokens and atomic components stay aligned. GOV.UK's research
  on error handling, field marking, and spacing is stronger -- adopt those patterns at
  the page composition level.
- **Fix flex components when they're wrong.** Components serve the product, not the
  other way around. If a component needs changes to support good UX, change it.
- **Conformance tests are the source of truth** for USWDS alignment. Any component
  change must update or add conformance tests that verify similarity with the USWDS
  reference. Tests should be accurate, concise, and easy to understand.

## 1. `flex-form` Foundation

### Problem

`flex-form` exists but has incorrect max-width values and isn't used by form delivery
pages. Current values: 20rem default, 30rem large. USWDS actual values: 32em default,
46rem large.

### Changes

**`flex-form` styles:**

| Property | Current | Target | USWDS reference |
|----------|---------|--------|-----------------|
| Default max-width | 20rem | 32em | `usa-form` |
| Large max-width | 30rem | 46rem | `usa-form--large` |

Everything else in the existing styles is correct: fieldset reset, legend styling,
input full-width within form, error group borders, button spacing.

**Form delivery pages:** Wrap content in `<Form size="large">` since multi-page
wizards with fieldset groups, descriptions, and help text need the wider variant.

**Conformance test updates:**

- Verify `max-width` for both default and large variants against actual USWDS values
- Add fixture for fieldset + legend inside form
- Add fixture for form-group error state (left red border)
- Keep the spec focused on structural properties: max-width, legend font-size/weight,
  fieldset reset, error border

## 2. Spacing and Vertical Rhythm

### Problem

Everything uses `l-stack` with a flat 16px gap. The form field wrapper uses
`--flex-spacing-1` which doesn't exist in tokens.css. No visual hierarchy between
label-to-input spacing, field-to-field spacing, and section-to-section spacing.

### Three-Tier Spacing Model

| Tier | Where | Value | Token |
|------|-------|-------|-------|
| Tight | Within a field (label, help text, input, error) | 4px | `--flex-space-xs` |
| Moderate | Between fields within a fieldset | 24px | `--flex-space-lg` |
| Generous | Between fieldset sections | 40px | `--flex-space-xl` (32px) + 8px top padding on legend |

### Implementation

- Fix broken token: replace `--flex-spacing-1` with `var(--flex-space-xs)` in
  `flex-form-field`
- Set `--stack-space: var(--flex-space-lg)` on fieldset-level stacks
- Add margin-top on fieldsets after the first for section separation
- Zero out `flex-label` margin-top within `flex-form` since between-field spacing
  is handled by the parent stack gap

## 3. Error Handling

### New Component: `flex-form-error-summary`

Renders at the top of the form page when validation fails.

```html
<div class="flex-form-error-summary" role="alert" tabindex="-1">
  <h2>There is a problem</h2>
  <ul>
    <li><a href="#fullName">Enter your full name</a></li>
    <li><a href="#email">Enter your email address</a></li>
  </ul>
</div>
```

- `role="alert"` for screen reader announcement
- `tabindex="-1"` for programmatic focus management
- Each error links to the field `id` via anchor
- Red left border, styled with `--flex-color-error`

### Error State on Field Groups

Wrap each field in `<div class="flex-form-group" data-state="error">` when it has
errors. The existing `flex-form` styles apply a red left border. This replaces the
current bare `l-stack` wrapper in `flex-form-field`.

### Inline Error Prefix

Add visually-hidden "Error: " prefix to `flex-error-message` for screen readers:

```html
<span class="flex-error-message" role="alert">
  <span class="u-visually-hidden">Error: </span>Enter your full name
</span>
```

### Page Title Prefix

Route handler prefixes `<title>` with "Error: " when validation errors are present.

### Required/Optional Marking

**Current:** Red asterisk on required fields via `flex-label` `required` prop.

**New:** Append "(optional)" text to optional field labels. Most civic form fields
are required, so marking the exceptions reduces visual noise.

- Add `optional` boolean prop to `flex-label`
- Remove the red asterisk visual (keep `required` HTML attribute on inputs)
- Render "(optional)" text suffix when `optional` is true

### Form Element

Add `novalidate` attribute to `<form>` elements. Browser-native validation messages
can't match our styling and GOV.UK research shows custom validation is more accessible.

### Route Handler Changes

The POST handler builds error summary data (field id + error message pairs), passes
it to the page view component, and sets the "Error: " title prefix.

### Client JS

Minimal inline script for error summary focus management:

```javascript
const errorSummary = document.querySelector('.flex-form-error-summary');
if (errorSummary) errorSummary.focus();
```

## 4. Field Width Sizing

### Smart Defaults

Map field types to `flex-text-input` width props:

| fieldType | width | USWDS equivalent | Rationale |
|-----------|-------|-------------------|-----------|
| `text` | (none) | full width | Unknown length |
| `email` | `xl` (40ex) | `.usa-input--xl` | Email addresses |
| `phone` | `md` (20ex) | `.usa-input--md` | Phone numbers |
| `url` | (none) | full width | URLs vary |
| `number` | `sm` (13ex) | `.usa-input--sm` | Short numbers |
| `currency` | `md` (20ex) | `.usa-input--md` | Dollar amounts |

Date, boolean, choice types are handled by their own components.

### Spec Override

Add optional `displayWidth` to `DataRequirement`:

```typescript
displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
```

Overrides the type-based default. Lets spec authors mark a zip code as `xs` or a
street address as `2xl`. Renderer checks `displayWidth` first, falls back to the
type mapping.

## 5. Progress Indication

### New Component: `flex-form-step-text`

Simple "Page X of Y" caption above the page heading.

**Props:** `current: number`, `total: number`

```html
<span class="flex-form-step-text">Page 1 of 3</span>
```

Styled: muted color, smaller font size, margin-bottom connecting it to the heading.

**Why not the step indicator bar:** Conditional page skipping changes the total step
count based on answers. Named steps that get skipped are confusing. The text caption
adapts naturally because we compute actual page count from current field state.

**Conformance note:** USWDS `usa-step-indicator__heading-counter` provides a similar
"Step N of N" text pattern. Model conformance spec against that.

**Page count computation:** Count only pages whose conditions are met given current
field state, so the numbers stay accurate as the user progresses.

## 6. Landing Page

### Changes

- Wrap in `<Form size="large">` for consistent width
- Description in `flex-prose` for proper reading-width line length
- Button label: "Start now" (GOV.UK convention for start pages)
- Better context text: section count, approximate time if derivable

## 7. Form Page Composition

All previous sections come together. Full structure:

```
<Form size="large">
  <flex-form-step-text current={2} total={3} />
  <h1>Employment</h1>

  [flex-form-error-summary if errors]

  <form method="post" action={actionUrl} novalidate>
    <fieldset>
      <legend>Employment Status</legend>
      <p>description</p>

      <div class="flex-form-group" data-state="error">
        <flex-label optional>...</flex-label>
        <span class="flex-hint">help text</span>
        <flex-error-message>...</flex-error-message>
        <flex-text-input width="md" />
      </div>

      <div class="flex-form-group">
        <flex-label>...</flex-label>
        <flex-text-input />
      </div>
    </fieldset>

    <div class="l-cluster">
      <a href={prevUrl}>Back</a>
      <button type="submit" class="flex-button">Continue</button>
    </div>
  </form>
</Form>
```

### Key Differences from Current

1. `<Form size="large">` wrapper constrains width
2. `flex-form-step-text` above heading
3. Error summary between heading and form (when errors)
4. `novalidate` on `<form>`
5. Fields wrapped in `flex-form-group` with error state
6. Labels use `optional` prop, not `required` asterisk
7. Field width props from type defaults / displayWidth override
8. "Back" link (GOV.UK convention) instead of "Previous"
9. Three-tier spacing

## 8. Review Page

### Changes

- Wrap in `<Form size="large">`
- Summary list pattern: each answer row gets a bottom border, label and value
  as dt/dd pairs
- "Change" links per section with visually-hidden context for screen readers:
  `Change <span class="u-visually-hidden">Personal Information</span>`
- Empty fields show "Not provided" in muted text
- Skipped conditional sections not shown (already the case)
- Submit button label: "Submit" (terminal action, distinct from "Continue")

## 9. Confirmation Page

### Changes

- Wrap in `<Form size="large">`
- `flex-alert` with `variant="success"` at top: "Your form has been submitted"
  with submission ID displayed prominently
- Human-readable timestamp ("11 April 2026 at 10:23am")
- "What happens next" section (static placeholder text)
- "Return to home" link so user isn't stranded

## 10. Responsive and Accessibility

### Responsive

No new breakpoint work needed. The flex system handles this:

- `max-width: 46rem` on form shrinks naturally on narrow viewports
- Field width props use `ex` units with max-width, shrink on mobile
- `l-cluster` wraps button group, stacks on narrow viewports
- Legends and headings scale with base font size

Verify button stacking order on mobile (Back, then Continue in reading order).

### Accessibility

- `novalidate` prevents browser validation messages
- Error summary: `role="alert"`, `tabindex="-1"`, focus on page load
- Visually-hidden "Error: " prefix on inline errors
- "Error: " page title prefix on validation failure
- "Change" links with visually-hidden section context
- Anchor links in error summary target field `id` attributes
- `aria-describedby` already wired for help text and errors

### Client JS

Single inline script for error summary focus. Three lines, only on form pages.

## New Components

| Component | Purpose |
|-----------|---------|
| `flex-form-error-summary` | Error summary at top of page with anchor links |
| `flex-form-step-text` | "Page X of Y" progress caption |

## Modified Components

| Component | Change |
|-----------|--------|
| `flex-form` | Fix max-widths to match USWDS, update conformance tests |
| `flex-form-field` | Fix broken token, wrap in form-group, field width props, optional label |
| `flex-form-page` | Full recomposition with all patterns |
| `flex-form-landing` | Form wrapper, prose, better copy |
| `flex-form-review` | Summary list pattern, Change links, Submit button |
| `flex-form-confirmation` | Success alert, formatted date, next steps |
| `flex-label` | Add `optional` prop, remove red asterisk visual |
| `flex-error-message` | Add visually-hidden "Error: " prefix |

## Type Changes

`DataRequirement` gains optional `displayWidth`:

```typescript
displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
```

## Out of Scope

- Custom per-form "What you'll need" content on landing page
- Real-time inline validation (removed from USWDS after v3.12 due to a11y issues)
- CSRF tokens (noted for future)
- Persistent sessions (Story 7+)
