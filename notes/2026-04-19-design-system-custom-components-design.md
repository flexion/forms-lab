---
status: draft
date: 2026-04-19
type: design
---

# Design system: first-class support for custom components

## Problem

The design system catalog and verification harness were built around USWDS-derived components. Three problems show up when a custom component (one without a USWDS reference, e.g. `flex-spec-diff-browser`, `flex-spec-browser`, `flex-confidence-badge`) goes through the same pipeline:

1. **Broken USWDS link.** `ComponentMeta.uswds: string` is required and rendered unconditionally as `USWDS Documentation ↗`. Custom components set it to `''`, producing a link that goes nowhere.
2. **No variant gallery.** USWDS-derived components author an `examples.tsx` whose exports become the live variant gallery on the catalog page. Custom components have none, so the page shows only a description.
3. **"Conformance" is the wrong frame.** The Playwright test runner diffs computed styles between a USWDS reference fixture and a flex fixture. For a custom component there is no reference to conform to; the word misrepresents what (if anything) the test verifies.

These are separate bugs with one root cause: the catalog and harness assume every component has a USWDS lineage. The fix is to make component *kind* a first-class concept and let presentation, naming, and verification adapt to it.

## Goals

- Custom components have a coherent presence on the catalog: kind-appropriate header, a variant gallery, a verification section labeled to match what's actually checked.
- The verification concept is renamed to something that fits both kinds — a component's documented promise to its callers, of which "matches USWDS" is one possible clause.
- Authoring a component (USWDS-derived or custom) is a single, well-organized convention: the same set of files in the same shape. No drift between the gallery and the verification list.
- Architecture tests enforce the invariants so the conventions don't decay.

## Non-goals

- Adding image-snapshot or pixel-diff regression tooling. Custom components get render + axe today.
- Renaming the existing `category` taxonomy.
- Bringing branch-only components (`flex-assistant`, `flex-staged-changes`) into the registry.
- Reworking USWDS-derived components beyond the rename and the new `kind` field.

## Approach

### 1. Component metadata

Replace `ComponentMeta.uswds: string` with an explicit `kind` plus an optional `reference`:

```ts
export type ComponentKind = 'uswds-derived' | 'custom'

export interface ComponentMeta {
  name: string
  slug: string
  category: ComponentCategory
  kind: ComponentKind
  description: string
  reference?: string  // USWDS doc URL — required when kind === 'uswds-derived', forbidden when kind === 'custom'
  interactive: boolean
}
```

The catalog page header reads `kind` and renders accordingly. For custom components it shows a short "Custom component — no upstream reference." sentence in place of the link, so the absence is intentional rather than ambient.

An architecture test enforces the kind/reference invariant rather than runtime guards.

### 2. Naming: "Conformance" → "Contract"

The verification concept becomes a *contract* — a documented promise the component keeps. USWDS-derived components have a clause that says "matches the USWDS reference"; custom components have clauses about variants, behavior, and accessibility but no such clause. The word fits both, and avoids overloading "spec" (which already means `DataCollectionSpec` / `FormSpec` in the domain).

| Old | New |
|---|---|
| `src/design-system/conformance/types.ts` | `src/design-system/contract/types.ts` |
| `src/design-system/test-helpers/conformance-runner.ts` | `src/design-system/test-helpers/contract-runner.ts` |
| `src/design-system/test-helpers/token-conformance.test.ts` | `src/design-system/test-helpers/token-contract.test.ts` |
| `components/<name>/conformance-spec.tsx` | `components/<name>/contract.ts` (or `.tsx` if JSX present) |
| `components/<name>/conformance.test.ts` | `components/<name>/contract.test.ts` |
| Catalog "Conformance" section heading | "Contract" |
| `src/entrypoints/app/public/switcher-conformance.test.ts` | `switcher-contract.test.ts` |
| `runVisualConformance` + `runAccessibilityAudit` exports | merged into `runContract(spec)` switching on `spec.kind` |

The current `runVisualConformance` and `runAccessibilityAudit` stay internally as private helpers used by `runContract` for the USWDS-derived branch. They are no longer exported.

### 3. Contract type — discriminated by kind

```ts
interface BaseContract {
  component: string
  behavior: BehaviorPromise[]
  accessibilityFixtureHtml?: string  // axe subject; defaults to gallery
}

interface UswdsContract extends BaseContract {
  kind: 'uswds-derived'
  reference: string
  mapping: ClassMapping[]
  verified: string[]
  structuralIgnores: string[]
  intentionalDifferences: IntentionalDifference[]
  fixtures: PairedFixture[]
  extraIgnoreAttributes?: string[]
  extraIgnoreBoxKeys?: string[]
}

interface CustomContract extends BaseContract {
  kind: 'custom'
  variants: VariantPromise[]  // {name, description} — one per examples.tsx export
}

export type Contract = UswdsContract | CustomContract
```

Type renames (shapes unchanged):

| Old | New |
|---|---|
| `ConformanceSpec` | `Contract` (now a discriminated union) |
| `ConformanceFixture` | `PairedFixture` |
| `BehaviorSpec` | `BehaviorPromise` |
| `ClassMapping` | unchanged |
| `IntentionalDifference` | unchanged |
| `FixtureInteraction` | unchanged |

### 4. `examples.tsx` is the single source of truth for variants

Both kinds require an `examples.tsx`. Each named export is one variant.

For **USWDS-derived** components, `examples.tsx` continues to drive the gallery. Test fixtures stay separate in `contract.fixtures` because they need paired USWDS markup that has no examples-equivalent.

For **custom** components, `examples.tsx` drives both the gallery and the test fixtures. The contract's `variants[]` list documents the intended variant set with descriptions, and an architecture test asserts `variants[].name` matches `examples.tsx` exports exactly. The runner walks the exports directly when rendering for axe — there is no separate fixture array to keep in sync.

This gives the cleanliness the user asked for: adding a variant to a custom component is a one-file change (add the export, add the matching `variants[]` entry — the architecture test fails if you do one without the other).

### 5. `runContract(spec)` behavior

Single entry point, switches on `spec.kind`:

- **uswds-derived:** existing behavior — visual computed-style diff per `fixtures` entry, axe audit on `accessibilityFixtureHtml`. Behavior list rendered as documentation only.
- **custom:** for each `variants[]` entry, dynamically import the matching export from `examples.tsx`, render it, run axe. No computed-style diff against an external reference. Behavior list rendered as documentation; per-component behavior tests can be added in the same `contract.test.ts` file alongside the `runContract(spec)` call when needed.

### 6. Catalog page presentation

#### Component detail page (`/catalog/design-system/<slug>`)

Header (kind-aware):

- Kind badge (`USWDS-derived` or `Custom`) alongside the existing category and interactive badges.
- For `uswds-derived`: `Reference: USWDS <name> ↗` link.
- For `custom`: `Custom component — no upstream reference.` sentence.

"Variants" section (renamed from "Examples", both kinds):

- Heading changed to **Variants**.
- Same Preview/Code tab pair per export.
- Required for both kinds. Empty state: "This component has no documented variants yet."

"Contract" section (renamed from "Conformance", both kinds):

- For `uswds-derived`: Reference link, Class mapping table, Verified properties chips, Intentional differences callouts, Behavior promises list.
- For `custom`: Documented variants list (`variants[]` with descriptions), Behavior promises, Accessibility (link to "view fixture" disclosure).

Source CSS section: unchanged.

#### Catalog index page (`/catalog/design-system`)

- Add a small filter at the top: **All / USWDS-derived / Custom**, default All.
- Each component card shows the kind badge so the distinction is visible at a glance.

### 7. Architecture tests

Three new invariants in `test/architecture/`:

1. **Kind/reference consistency.** `kind === 'uswds-derived'` ↔ `reference` is a non-empty USWDS URL. `kind === 'custom'` ↔ `reference` is absent.
2. **Variant/example alignment.** For every custom component, `contract.variants[].name` equals the set of named exports in `examples.tsx` (same set, same casing).
3. **Required files.** Every component in the registry has `meta.ts`, `index.tsx`, `examples.tsx`, `contract.ts`, `contract.test.ts`. (Today this is partially enforced; this makes it total.)

## File layout

Final shape, identical for every component regardless of kind:

```
src/design-system/components/flex-<name>/
  meta.ts            # name, slug, category, kind, description, reference?, interactive
  index.tsx          # implementation
  styles.css         # styles
  examples.tsx       # variant gallery — one named export per variant (REQUIRED)
  contract.ts        # verification spec (REQUIRED)
  contract.test.ts   # one-liner: runContract(spec)
```

## Rollout order

1. Rename files, types, runner, and the catalog section heading. Switch all existing components to `kind: 'uswds-derived'` and `reference: <existing URL>`. Tests stay green.
2. Add the three architecture tests. They pass because every component is still USWDS-derived with a reference.
3. Convert known custom components one at a time (`flex-spec-browser`, `flex-spec-diff-browser`, `flex-confidence-badge`, `flex-semantic-diff`, plus any others surfaced during inventory): add `kind: 'custom'`, drop `reference`, write `examples.tsx` and `contract.ts`. Architecture tests catch any missing pieces.
4. Update the catalog page to render kind-aware sections and add the index-page filter.

## Open questions

None blocking. Decisions deferred to implementation:

- Exact set of components to classify as `custom` (a short inventory at the start of step 3).
- Whether `BehaviorPromise.tested: true` should be enforced by a test that finds the matching assertion in `contract.test.ts` (probably not in this pass — keep it as documentation for now).
