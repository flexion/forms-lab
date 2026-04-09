# Conformance Fixture JSX Refactor Design

**Date:** 2026-04-09
**Status:** Approved
**Branch:** `slice-0/skeleton`

## Problem

Conformance specs contain duplicated HTML strings — each fixture has a `uswds` and `flex` string that share the same text content (button labels, alert body text, link text) but differ in class names, attributes, or nesting. Changing test text requires editing two strings per fixture across potentially many variants.

## Solution

Rename conformance-spec.ts → conformance-spec.tsx. Define fixture functions using Hono JSX that generate both HTML strings from shared content. Call `.toString()` on JSX elements to produce the string the conformance runner expects.

## Design rule

**If the two JSX blocks differ only in class/attribute mapping, use a parameterized function.** The function name and parameters make it clear what varies. Both JSX expressions are short enough to scan at a glance.

**If the two JSX blocks differ in structure (different nesting, wrapper elements, custom element tags), keep both explicit.** The developer needs to see both to understand what the conformance test actually compares. Content constants are still shared.

## Pattern: Trivially different (~65% of components)

```tsx
function tagFixture(name: string, size?: string) {
  const text = 'New'
  return {
    name,
    uswds: (<span class={`usa-tag${size ? ` usa-tag--${size}` : ''}`}>{text}</span>).toString(),
    flex: (<span class="flex-tag" data-size={size}>{text}</span>).toString(),
  }
}

fixtures: [
  tagFixture('default tag'),
  tagFixture('big tag', 'big'),
]
```

## Pattern: Moderately different (~30% of components)

```tsx
const ALERT_BODY = <>Lorem ipsum dolor sit amet, <a href="/example">consectetur adipiscing</a> elit, sed do eiusmod.</>

function alertFixture(variant: string) {
  const heading = `${variant.charAt(0).toUpperCase() + variant.slice(1)} status`
  return {
    name: `${variant} alert`,
    uswds: (
      <div class={`usa-alert usa-alert--${variant}`} role="alert" data-testid="target">
        <div class="usa-alert__body">
          <h4 class="usa-alert__heading">{heading}</h4>
          <p class="usa-alert__text">{ALERT_BODY}</p>
        </div>
      </div>
    ).toString(),
    flex: (
      <div class="flex-alert" data-variant={variant} role="alert" data-testid="target">
        <h4 class="flex-alert__heading">{heading}</h4>
        <p class="flex-alert__text">{ALERT_BODY}</p>
      </div>
    ).toString(),
  }
}

fixtures: ['info', 'error', 'success', 'warning'].map(v => alertFixture(v))
```

## Shared content

`src/components/test-content.tsx` — only for content appearing in 3+ specs:

```tsx
export const LOREM_WITH_LINK = <>Lorem ipsum dolor sit amet, <a href="/example">consectetur adipiscing</a> elit, sed do eiusmod.</>
```

Most content stays local to its component.

## What doesn't change

- `ConformanceSpec` and `ConformanceFixture` types
- `conformance-runner.ts`
- `conformance.test.ts` files (still import spec, call runner)
- Component source files (index.tsx, styles.css, client.ts, meta.ts, examples.tsx)
- The `interaction` field on fixtures

## Verification

Behavior-preserving refactor. All 270 conformance tests must pass after the change. The `.toString()` output must match the previous raw HTML strings.

## Scope

Rename and refactor all `conformance-spec.ts` → `conformance-spec.tsx` across all components with fixture arrays. Components without fixtures (label, textarea, error-message — tested as part of text-input) don't need changes.
