# Component Catalog Tabbed Example Viewer

**Date:** 2026-04-09
**Story:** [#1 — Bootstrap design system and catalog](https://github.com/flexion/forms-lab/issues/1)
**Status:** draft

## Problem

The component catalog renders examples as stacked previews with no way to inspect the rendered HTML markup. Peer design systems (USWDS, Shoelace, Storybook) provide a tabbed interface per example with Preview and Code panels. The catalog also dumps raw CSS source at the bottom of component pages with no structure.

## Design

### New Component: `flex-tab-group`

A general-purpose tab component following the established interactive component pattern (server JSX + custom element progressive enhancement). Dogfoods the design system in the catalog itself.

**Server-rendered HTML structure:**

```html
<flex-tab-group>
  <div role="tablist" aria-label="...">
    <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">
      Preview
    </button>
    <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2" tabindex="-1">
      Code
    </button>
  </div>
  <div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
    <!-- content -->
  </div>
  <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
    <!-- content -->
  </div>
</flex-tab-group>
```

**JSX API:**

```tsx
<TabGroup label="Example viewer">
  <Tab title="Preview">
    <ExampleFn />
  </Tab>
  <Tab title="Code">
    <pre><code>{highlightedHtml}</code></pre>
  </Tab>
</TabGroup>
```

**Progressive enhancement:**

- Without JS: first panel visible, others hidden. Tab buttons are rendered but non-functional. This is the standard progressive enhancement pattern — rendering all panels visible would cause a flash of content when JS loads and hides inactive panels. Users without JS see the first (default) panel content.
- With JS: custom element `flex-tab-group` upgrades — hides inactive panels, manages `aria-selected`, `tabindex`, and keyboard navigation.

**Keyboard behavior (WAI-ARIA Tabs pattern):**

- Arrow Left/Right: move between tabs
- Home/End: jump to first/last tab
- Tab: move focus into active panel

**File structure:**

```
src/app/components/flex-tab-group/
  index.tsx           — TabGroup and Tab server components
  client.ts           — FlexTabGroupElement custom element
  styles.css          — Design-token-based styling (cascade layer: block)
  meta.ts             — Component metadata for registry
  examples.tsx        — Catalog examples (self-documenting)
  conformance-spec.tsx — USWDS tab component mapping
```

### HTML Capture and Pretty-Printing

Each example function is called server-side. The rendered HTML string is:

1. Pretty-printed with a lightweight formatter (basic tag indentation)
2. Syntax-highlighted with highlight.js (already in use for CSS source)
3. Passed to the Code tab panel

A small utility function handles the pretty-printing. The output is simple component markup — a full HTML parser is unnecessary.

### Catalog Integration

**Component page changes (`design-system.tsx`):**

Each example entry becomes a `TabGroup`:

```tsx
<h3>{name}</h3>
<TabGroup label={`${name} example`}>
  <Tab title="Preview">
    <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
      <ExampleFn />
    </div>
  </Tab>
  <Tab title="Code">
    <pre><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
  </Tab>
</TabGroup>
```

**CSS source section:** Wrapped in `flex-accordion` instead of a bare `<pre>` block, keeping the page tidy while preserving access to the full stylesheet.

### What Does Not Change

- Existing `examples.tsx` files in any component
- Component registry pattern (flex-tab-group added like any other component)
- CSS architecture or token system
- Conformance testing approach

## Testing

- **flex-tab-group conformance tests:** visual comparison to USWDS tab component
- **HTML pretty-printer unit tests:** verify formatting of representative markup
- **Catalog page tests:** verify tab groups render with code panels for component examples
- **Accessibility:** keyboard navigation, ARIA attributes verified in conformance spec

## Approach Considered and Rejected

- **Catalog-specific `<example-viewer>` element:** narrower scope but misses the dogfooding opportunity and duplicates tab-like behavior outside the design system.
- **Reuse `flex-accordion` for code toggle:** semantically wrong for this use case. Tabs and accordions serve different interaction patterns.
