# Design system: custom-component support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make custom (non-USWDS-derived) components first-class in the design system: kind-aware metadata, a unified "Contract" verification concept, required `examples.tsx` and `contract.ts` for every component, and a kind-aware catalog page presentation.

**Architecture:** `ComponentMeta` gains a `kind: 'uswds-derived' | 'custom'` field; the `Contract` type is a discriminated union over `kind`. A single `runContract(spec)` runner switches on kind: USWDS-derived components run the existing visual-diff + axe; custom components render each `examples.tsx` export and run axe (no external reference). Architecture tests enforce the conventions.

**Tech Stack:** TypeScript + Bun, Hono JSX (server-rendered), Playwright (per-component contract tests), `bun:test` (architecture tests).

**Spec:** `notes/2026-04-19-design-system-custom-components-design.md`.

---

## Inventory (locked at plan-write time)

- **Total registered components:** 53 (see `src/design-system/registry.ts`).
- **USWDS-derived meta files:** 48 (`uswds:` set to a non-empty URL).
- **Custom (registered) components, 7:** `flex-branch-switcher`, `flex-change-indicator`, `flex-confidence-badge`, `flex-preview-banner`, `flex-semantic-diff`, `flex-spec-browser`, `flex-spec-diff-browser`. None of these have `examples.tsx` or any conformance file today; all have `meta.ts`, `index.tsx`, `styles.css` (some have `client.ts`).
- **Out of scope:** `flex-assistant`, `flex-staged-changes`, `flex-branch-indicator`, `flex-variant-callout` (component directories that exist but are not in `registry.ts`; likely branch-only).

---

## File structure

**New:**
- `src/design-system/contract/types.ts` — `Contract` discriminated union, `PairedFixture`, `BehaviorPromise`, `VariantPromise`, `ClassMapping`, `IntentionalDifference`, `FixtureInteraction`, `ComponentKind`.
- `src/design-system/test-helpers/contract-runner.ts` — single `runContract(spec)` entry point.
- `src/design-system/components/<custom-name>/examples.tsx` — one per registered custom component (7).
- `src/design-system/components/<custom-name>/contract.ts` — one per registered custom component (7).
- `src/design-system/components/<custom-name>/contract.test.ts` — one per registered custom component (7).
- `test/architecture/component-conventions.test.ts` — kind/reference, variant/example alignment, required files.

**Renamed:**
- `src/design-system/conformance/` → `src/design-system/contract/`.
- `src/design-system/test-helpers/conformance-runner.ts` → `src/design-system/test-helpers/contract-runner.ts`.
- `src/design-system/test-helpers/token-conformance.test.ts` → `src/design-system/test-helpers/token-contract.test.ts`.
- `src/design-system/components/<name>/conformance-spec.tsx` → `contract.tsx` (or `.ts` if no JSX) — 47 components.
- `src/design-system/components/<name>/conformance.test.ts` → `contract.test.ts` — 44 components.
- `src/entrypoints/app/public/switcher-conformance.test.ts` → `switcher-contract.test.ts`.

**Modified:**
- `src/design-system/types.ts` — `ComponentMeta` gains `kind`, `reference?`; loses `uswds`.
- `src/design-system/components/<name>/meta.ts` — all 53 — `uswds: <url>` → `kind: 'uswds-derived', reference: <url>` or `kind: 'custom'` (no `reference`).
- `src/entrypoints/app/routes/catalog/design-system.tsx` — kind-aware header, "Variants" rename, "Contract" rename, kind-aware sub-sections, index-page filter.

---

## Task 0: Branch off main

The repo's standing rule is no direct commits to main, even for notes/planning. This work is large enough that it should run in its own worktree.

- [ ] **Step 1:** Run `bun run cli` and confirm `/start-story` is the right entry point (or fall back to a manual `git worktree add`).
- [ ] **Step 2:** Create the branch and worktree.

```bash
# Preferred (project convention):
# /start-story design-system-custom-components

# Manual fallback:
git worktree add ../forms-lab-design-system-custom-components -b story-design-system-custom-components
cd ../forms-lab-design-system-custom-components
```

- [ ] **Step 3:** Move the spec and plan into the worktree if they were written on `main`.

```bash
# From the worktree:
git checkout main -- notes/2026-04-19-design-system-custom-components-design.md notes/2026-04-19-design-system-custom-components-plan.md
git add notes/2026-04-19-design-system-custom-components-design.md notes/2026-04-19-design-system-custom-components-plan.md
git commit -m "docs(design-system): add design and plan for custom-component support"
```

---

## Task 1: Introduce `Contract` types alongside `ConformanceSpec` (no behavior change)

Add the new types in a new `contract/` directory. Leave `conformance/types.ts` untouched for now — it'll be deleted at the end of Task 3 once all components are migrated.

**Files:**
- Create: `src/design-system/contract/types.ts`

- [ ] **Step 1:** Create the new types file. The shapes mirror `ConformanceSpec` plus the discriminated union and the `VariantPromise` type for custom components.

```ts
// src/design-system/contract/types.ts

export type ComponentKind = 'uswds-derived' | 'custom'

export interface FixtureInteraction {
  action: 'hover' | 'focus' | 'click'
  uswdsSelector: string
  flexSelector: string
}

export interface PairedFixture {
  name: string
  uswds: string
  flex: string
  uswdsSelector?: string
  flexSelector?: string
  interaction?: FixtureInteraction
}

export interface IntentionalDifference {
  property: string
  ours: string
  uswds: string
  reason: string
}

export interface BehaviorPromise {
  description: string
  tested: boolean
}

export interface ClassMapping {
  uswds: string
  flex: string
  notes: string
}

export interface VariantPromise {
  /** Must match the named export in examples.tsx exactly. */
  name: string
  /** Human-readable description shown on the catalog page. */
  description: string
}

interface BaseContract {
  component: string
  behavior: BehaviorPromise[]
  accessibilityFixtureHtml?: string
}

export interface UswdsContract extends BaseContract {
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

export interface CustomContract extends BaseContract {
  kind: 'custom'
  variants: VariantPromise[]
}

export type Contract = UswdsContract | CustomContract
```

- [ ] **Step 2:** Run the type checker.

```bash
bun run --no-warnings tsc --noEmit
```

Expected: no new errors (the new file is unused so far).

- [ ] **Step 3:** Commit.

```bash
git add src/design-system/contract/types.ts
git commit -m "feat(design-system): add Contract discriminated union type

Introduces Contract = UswdsContract | CustomContract, plus PairedFixture,
BehaviorPromise, and VariantPromise types. Existing ConformanceSpec is
unchanged and will be removed once per-component files are migrated.
"
```

---

## Task 2: Add `runContract(spec)` runner alongside the existing one

Create a new runner file that exports `runContract` and switches on `spec.kind`. The USWDS-derived branch reuses the existing private helpers; the custom branch is new.

**Files:**
- Create: `src/design-system/test-helpers/contract-runner.ts`

- [ ] **Step 1:** Read the existing `conformance-runner.ts` to understand the helpers.

```bash
cat src/design-system/test-helpers/conformance-runner.ts
```

- [ ] **Step 2:** Create the new runner.

```ts
// src/design-system/test-helpers/contract-runner.ts

import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import type {
  Contract,
  CustomContract,
  FixtureInteraction,
  UswdsContract,
} from '../contract/types'
import { diff, extract } from '../visual-descriptor'
import { expectMatch } from './assertions'
import { renderFlexFixture, renderUswdsFixture } from './render'

async function triggerInteraction(
  page: Page,
  action: FixtureInteraction['action'],
  selector: string,
) {
  const element = page.locator(selector)
  switch (action) {
    case 'hover':
      await element.hover()
      break
    case 'focus':
      await element.focus()
      break
    case 'click':
      await element.click()
      break
  }
}

function runUswdsContract(spec: UswdsContract) {
  const ignoreProperties = [
    ...spec.structuralIgnores,
    ...spec.intentionalDifferences.map((d) => d.property),
  ]
  const ignoreBoxKeys = ['width', 'height', ...(spec.extraIgnoreBoxKeys ?? [])]
  const ignoreAttributes = [
    'class',
    'data-testid',
    'data-variant',
    'data-size',
    'data-state',
    'data-slim',
    'data-no-icon',
    ...(spec.extraIgnoreAttributes ?? []),
  ]

  test.describe(`${spec.component} contract (USWDS-derived)`, () => {
    for (const fixture of spec.fixtures) {
      test(`visual: ${fixture.name}`, async ({ page }) => {
        await renderUswdsFixture(page, fixture.uswds)
        if (fixture.interaction) {
          await triggerInteraction(
            page,
            fixture.interaction.action,
            fixture.interaction.uswdsSelector,
          )
        }
        const reference = await extract(
          page,
          '',
          fixture.uswdsSelector ?? '[data-testid="target"]',
        )

        await renderFlexFixture(page, fixture.flex)
        if (fixture.interaction) {
          await triggerInteraction(
            page,
            fixture.interaction.action,
            fixture.interaction.flexSelector,
          )
        }
        const implementation = await extract(
          page,
          '',
          fixture.flexSelector ?? '[data-testid="target"]',
        )

        const differences = diff(reference, implementation, '', {
          ignoreProperties,
          ignoreBoxKeys,
          ignoreAttributes,
          ignoreChildren: true,
          ignorePseudos: true,
        })
        expectMatch(differences)
      })
    }

    test('passes axe audit', async ({ page }) => {
      const AxeBuilder = (await import('@axe-core/playwright')).default
      const html =
        spec.accessibilityFixtureHtml ??
        `<main><h1>${spec.component} Test</h1>${spec.fixtures.map((f) => f.flex).join('\n')}</main>`
      await renderFlexFixture(page, html)
      await page.evaluate(() => {
        document.title = 'Contract Test'
      })
      const results = await new AxeBuilder({ page })
        .disableRules(['heading-order'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  })
}

function runCustomContract(spec: CustomContract) {
  test.describe(`${spec.component} contract (custom)`, () => {
    test('passes axe audit', async ({ page }) => {
      const AxeBuilder = (await import('@axe-core/playwright')).default

      // Dynamically import examples.tsx for this component and render every
      // export as a single fixture for the audit.
      const examplesModule = await import(
        `../components/${spec.component}/examples.tsx`
      )
      const renderedExports = Object.entries(examplesModule)
        .filter(([key]) => key !== 'default')
        .map(([_, fn]) => (fn as () => unknown)())
        .map((node) => String(node))
        .join('\n')

      const html =
        spec.accessibilityFixtureHtml ??
        `<main><h1>${spec.component} Test</h1>${renderedExports}</main>`
      await renderFlexFixture(page, html)
      await page.evaluate(() => {
        document.title = 'Contract Test'
      })
      const results = await new AxeBuilder({ page })
        .disableRules(['heading-order'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  })
}

/**
 * Run the contract test suite for a component. Switches on spec.kind.
 *
 * - uswds-derived: visual computed-style diff per fixture + axe audit.
 * - custom:        renders every examples.tsx export and runs axe.
 */
export function runContract(spec: Contract) {
  if (spec.kind === 'uswds-derived') {
    runUswdsContract(spec)
  } else {
    runCustomContract(spec)
  }
}
```

- [ ] **Step 3:** Run type check.

```bash
bun run --no-warnings tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4:** Commit.

```bash
git add src/design-system/test-helpers/contract-runner.ts
git commit -m "feat(design-system): add runContract(spec) test runner

Single entry point that switches on spec.kind. USWDS-derived branch reuses
the existing visual-diff + axe logic; custom branch renders every export
from the component's examples.tsx and runs axe."
```

---

## Task 3: Migrate per-component conformance files to contract files

Mechanical rename across all components. Tests stay green throughout because each migration is atomic per-component (rename + import update + function-call swap). The `Contract` discriminated union accepts the same shape as `ConformanceSpec` for the USWDS branch — just add `kind: 'uswds-derived'`.

**Files affected:** 47 `conformance-spec.{ts,tsx}` files, 44 `conformance.test.ts` files.

- [ ] **Step 1:** Pick one component as a worked example: `flex-button`. Migrate it manually so the pattern is locked in.

  Rename:
  ```bash
  cd src/design-system/components/flex-button
  git mv conformance-spec.tsx contract.tsx
  git mv conformance.test.ts contract.test.ts
  ```

  Edit `contract.tsx` — change the import and the spec literal:
  ```diff
  - import type { ConformanceSpec } from '../../conformance/types'
  + import type { UswdsContract } from '../../contract/types'

  - export const spec: ConformanceSpec = {
  + export const spec: UswdsContract = {
  +   kind: 'uswds-derived',
      component: 'flex-button',
      reference: 'https://designsystem.digital.gov/components/button/',
      ...
  ```

  Edit `contract.test.ts`:
  ```ts
  import { runContract } from '../../test-helpers/contract-runner'
  import { spec } from './contract'

  runContract(spec)
  ```

- [ ] **Step 2:** Run the button's tests to verify they still pass.

```bash
bun test src/design-system/components/flex-button/contract.test.ts
```

Expected: same passes/fails as before the rename.

- [ ] **Step 3:** Commit the worked example.

```bash
git add src/design-system/components/flex-button
git commit -m "refactor(design-system): migrate flex-button to contract pattern"
```

- [ ] **Step 4:** Repeat for the remaining 46 USWDS-derived components with conformance specs. Each follows the exact same edits (import path, type name, add `kind: 'uswds-derived'`, rename file, swap test runner call).

  Batch suggestion: do them in groups of ~10, run `bun run check` after each group, commit per group.

  ```bash
  bun run check
  git add src/design-system/components
  git commit -m "refactor(design-system): migrate <names> to contract pattern"
  ```

- [ ] **Step 5:** Update `src/entrypoints/app/routes/catalog/design-system.tsx` to import `Contract` from the new location. The import path changes; the type name changes from `ConformanceSpec` to `Contract`. The dynamic import path changes from `conformance-spec.ts` to `contract.ts` (or `.tsx`).

```diff
- import type { ConformanceSpec } from '../../../../design-system/conformance/types'
+ import type { Contract } from '../../../../design-system/contract/types'
...
- let conformanceSpec: ConformanceSpec | null = null
+ let contract: Contract | null = null
  try {
-   const specModule = await import(
-     `../../../../design-system/components/${meta.slug}/conformance-spec.ts`
-   )
-   conformanceSpec = specModule.spec
+   const mod = await import(
+     `../../../../design-system/components/${meta.slug}/contract.ts`
+   ).catch(() =>
+     import(`../../../../design-system/components/${meta.slug}/contract.tsx`),
+   )
+   contract = mod.spec
  } catch {
    // No contract for this component
  }
```

The variable rename ripples through the rest of the route — change `conformanceSpec` → `contract` everywhere in this file (will be revisited in Task 6 for kind-aware rendering, but the rename is atomic now).

- [ ] **Step 6:** Migrate the `switcher-conformance.test.ts` outlier in `src/entrypoints/app/public/`.

```bash
git mv src/entrypoints/app/public/switcher-conformance.test.ts \
       src/entrypoints/app/public/switcher-contract.test.ts
```

Update its imports if it references the conformance dir.

- [ ] **Step 7:** Migrate `src/design-system/test-helpers/token-conformance.test.ts`.

```bash
git mv src/design-system/test-helpers/token-conformance.test.ts \
       src/design-system/test-helpers/token-contract.test.ts
```

Update any internal imports.

- [ ] **Step 8:** Delete the now-unused `src/design-system/conformance/` directory and the old `conformance-runner.ts`.

```bash
git rm -r src/design-system/conformance
git rm src/design-system/test-helpers/conformance-runner.ts
```

- [ ] **Step 9:** Run the full check.

```bash
bun run check
```

Expected: green.

- [ ] **Step 10:** Commit.

```bash
git add -A
git commit -m "refactor(design-system): rename conformance/ to contract/, delete old runner"
```

---

## Task 4: Update `ComponentMeta` and all `meta.ts` files to use `kind` + `reference`

Atomic change: drop `uswds`, add `kind` + `reference?`.

**Files:**
- Modify: `src/design-system/types.ts`
- Modify: all 53 `src/design-system/components/*/meta.ts` files

- [ ] **Step 1:** Update `src/design-system/types.ts`.

```ts
import type { ComponentKind } from './contract/types'

export type ComponentCategory =
  | 'form'
  | 'action'
  | 'feedback'
  | 'navigation'
  | 'layout'
  | 'process'
  | 'identity'

export interface ComponentMeta {
  name: string
  slug: string
  category: ComponentCategory
  kind: ComponentKind
  description: string
  reference?: string
  interactive: boolean
}
```

- [ ] **Step 2:** Run the type checker — expect 53 errors (every meta file is now wrong).

```bash
bun run --no-warnings tsc --noEmit
```

Expected: errors of the form `Property 'kind' is missing in type ...` and `'uswds' does not exist in type ...`.

- [ ] **Step 3:** Migrate one meta file as a worked example for each kind.

  USWDS-derived (`flex-button/meta.ts`):
  ```ts
  import type { ComponentMeta } from '../../types'

  export const meta: ComponentMeta = {
    name: 'Button',
    slug: 'flex-button',
    category: 'action',
    kind: 'uswds-derived',
    description: 'A clickable button for form submissions and actions.',
    reference: 'https://designsystem.digital.gov/components/button/',
    interactive: false,
  }
  ```

  Custom (`flex-spec-diff-browser/meta.ts`):
  ```ts
  import type { ComponentMeta } from '../../types'

  export const meta: ComponentMeta = {
    name: 'Spec Diff Browser',
    slug: 'flex-spec-diff-browser',
    category: 'feedback',
    kind: 'custom',
    description:
      'Annotated single-column diff of a form spec. Renders the head tree with inline change badges, before/after rows for modified fields, and base-only entries spliced in for removed pages, groups, and fields. Tops the view with an overview strip of change counts and jump-links.',
    interactive: true,
  }
  ```

- [ ] **Step 4:** Migrate the remaining 51 meta files. The pattern:
  - If old `uswds` was a non-empty URL → `kind: 'uswds-derived', reference: <that URL>`.
  - If old `uswds` was `''` → `kind: 'custom'` (no `reference` field).

  Affected custom (registered): `flex-branch-switcher`, `flex-change-indicator`, `flex-confidence-badge`, `flex-preview-banner`, `flex-semantic-diff`, `flex-spec-browser`, `flex-spec-diff-browser`. All others are `uswds-derived`.

- [ ] **Step 5:** Verify all components have correct kind.

```bash
grep -L "kind:" src/design-system/components/*/meta.ts
```

Expected: empty output (every meta has `kind`).

- [ ] **Step 6:** Run the full check.

```bash
bun run check
```

Expected: green. Catalog page may render the kind incorrectly until Task 6, but tests pass.

- [ ] **Step 7:** Commit.

```bash
git add -A
git commit -m "feat(design-system): replace ComponentMeta.uswds with kind + reference

Every meta declares kind: 'uswds-derived' | 'custom' explicitly. The
USWDS reference URL moves to an optional reference field, present only
when kind === 'uswds-derived'."
```

---

## Task 5: Add architecture invariant test for kind/reference consistency

This is the first of three architecture tests. It catches future drift.

**Files:**
- Create: `test/architecture/component-conventions.test.ts`

- [ ] **Step 1:** Write the failing test (well — it should pass since we just fixed all metas, but write it first so the convention is documented).

```ts
// test/architecture/component-conventions.test.ts

import { describe, expect, it } from 'bun:test'
import { getComponents } from '../../src/design-system/registry'

describe('component metadata: kind and reference invariants', () => {
  for (const meta of getComponents()) {
    describe(meta.slug, () => {
      if (meta.kind === 'uswds-derived') {
        it('declares a USWDS reference URL', () => {
          expect(meta.reference).toBeDefined()
          expect(meta.reference).toMatch(/^https:\/\/designsystem\.digital\.gov\//)
        })
      } else {
        it('does not declare a reference URL', () => {
          expect(meta.reference).toBeUndefined()
        })
      }
    })
  }
})
```

- [ ] **Step 2:** Run the test.

```bash
bun test test/architecture/component-conventions.test.ts
```

Expected: all pass.

- [ ] **Step 3:** Commit.

```bash
git add test/architecture/component-conventions.test.ts
git commit -m "test(architecture): enforce ComponentMeta kind/reference invariant"
```

---

## Task 6: Add `examples.tsx`, `contract.ts`, and `contract.test.ts` for each registered custom component

Per-component work. Pattern is the same; only the variants differ. Use one component as a worked example, then repeat for the remaining 6.

**Files (per custom component):**
- Create: `src/design-system/components/<name>/examples.tsx`
- Create: `src/design-system/components/<name>/contract.ts`
- Create: `src/design-system/components/<name>/contract.test.ts`

### Worked example: `flex-confidence-badge`

- [ ] **Step 1:** Read the component to identify variants.

```bash
cat src/design-system/components/flex-confidence-badge/index.tsx
```

Identify the props the component accepts (e.g., `confidence` levels: high/medium/low/needs-review). Each meaningful state becomes one variant.

- [ ] **Step 2:** Write `examples.tsx`. One named export per variant; export name uses `PascalCase` and reads as a sentence in the catalog gallery (the existing convention — see `flex-button/examples.tsx`).

```tsx
// src/design-system/components/flex-confidence-badge/examples.tsx
/** @jsxImportSource hono/jsx */
import { ConfidenceBadge } from './index'

// Names must match contract.variants[].name exactly.
export const HighConfidence = () => <ConfidenceBadge confidence={0.95} />
export const NeedsReview = () => <ConfidenceBadge confidence={0.6} />
export const LowConfidence = () => <ConfidenceBadge confidence={0.3} />
```

(Adjust prop names/values to whatever the actual component takes.)

- [ ] **Step 3:** Write `contract.ts`.

```ts
// src/design-system/components/flex-confidence-badge/contract.ts
import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-confidence-badge',
  variants: [
    {
      name: 'HighConfidence',
      description:
        'Hidden by default — high-confidence values do not surface a badge.',
    },
    {
      name: 'NeedsReview',
      description: 'Shown when confidence falls below the review threshold.',
    },
    {
      name: 'LowConfidence',
      description: 'Strong "Low confidence" signal for very low-scoring fields.',
    },
  ],
  behavior: [
    {
      description: 'Returns null for confidence above the high-threshold.',
      tested: false,
    },
    {
      description: 'Communicates state via text + icon, not color alone.',
      tested: false,
    },
  ],
}
```

- [ ] **Step 4:** Write `contract.test.ts`.

```ts
// src/design-system/components/flex-confidence-badge/contract.test.ts
import { runContract } from '../../test-helpers/contract-runner'
import { spec } from './contract'

runContract(spec)
```

- [ ] **Step 5:** Run the contract test.

```bash
bun test src/design-system/components/flex-confidence-badge/contract.test.ts
```

Expected: axe audit passes (or fails with a real a11y issue worth fixing — investigate before suppressing).

- [ ] **Step 6:** Commit.

```bash
git add src/design-system/components/flex-confidence-badge
git commit -m "feat(design-system): add contract and examples for flex-confidence-badge"
```

### Repeat for the remaining 6 custom components

For each of: `flex-branch-switcher`, `flex-change-indicator`, `flex-preview-banner`, `flex-semantic-diff`, `flex-spec-browser`, `flex-spec-diff-browser`:

- [ ] **Step 7:** Read `index.tsx`, identify variants, write the three files following the worked example. Commit per component.

  Notes per component:
  - `flex-branch-switcher` — interactive; variants likely cover open/closed states and with/without create-form expansion. May need fixture HTML in `accessibilityFixtureHtml` for the dropdown trigger.
  - `flex-change-indicator` — small badge; variants for each change type (added/modified/removed/unchanged).
  - `flex-preview-banner` — the dismissible site-wide preview banner; variants for the few states it has.
  - `flex-semantic-diff` — diff viewer; variants for added-only, removed-only, modified, no-changes.
  - `flex-spec-browser` — two-pane structured browser; variants for empty, populated, with-selection.
  - `flex-spec-diff-browser` — full diff browser; variants for clean, with-changes, only-additions, only-removals.

  Where the component doesn't have meaningfully distinct prop combinations yet, write a single `Default` variant — that's enough to clear the architecture-test alignment check and start the gallery. Add more as the component matures.

- [ ] **Step 8:** After all 7 components are done, run the full check.

```bash
bun run check
```

Expected: green.

---

## Task 7: Add architecture invariant test for variant/example alignment

For every custom component, `contract.variants[].name` must equal the set of named exports in `examples.tsx`.

**Files:**
- Modify: `test/architecture/component-conventions.test.ts`

- [ ] **Step 1:** Add the test alongside the kind/reference test.

```ts
// Append to test/architecture/component-conventions.test.ts

describe('custom components: variant/example alignment', () => {
  for (const meta of getComponents()) {
    if (meta.kind !== 'custom') continue

    it(`${meta.slug}: contract.variants matches examples.tsx exports`, async () => {
      const contractMod = await import(
        `../../src/design-system/components/${meta.slug}/contract.ts`
      )
      const examplesMod = await import(
        `../../src/design-system/components/${meta.slug}/examples.tsx`
      )

      const declaredVariants = new Set(
        contractMod.spec.variants.map((v: { name: string }) => v.name),
      )
      const exportedVariants = new Set(
        Object.keys(examplesMod).filter((k) => k !== 'default'),
      )

      expect([...declaredVariants].sort()).toEqual(
        [...exportedVariants].sort(),
      )
    })
  }
})
```

- [ ] **Step 2:** Run.

```bash
bun test test/architecture/component-conventions.test.ts
```

Expected: all pass.

- [ ] **Step 3:** Commit.

```bash
git add test/architecture/component-conventions.test.ts
git commit -m "test(architecture): enforce custom-component variant/example alignment"
```

---

## Task 8: Add architecture invariant test for required files

Every registered component must have `meta.ts`, `index.tsx`, `examples.tsx`, `contract.ts` (or `.tsx`), `contract.test.ts`.

**Files:**
- Modify: `test/architecture/component-conventions.test.ts`

- [ ] **Step 1:** Append the test.

```ts
// Append to test/architecture/component-conventions.test.ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'

describe('component file conventions', () => {
  const componentsDir = join(process.cwd(), 'src/design-system/components')

  for (const meta of getComponents()) {
    describe(meta.slug, () => {
      const dir = join(componentsDir, meta.slug)

      it('has meta.ts', () => {
        expect(existsSync(join(dir, 'meta.ts'))).toBe(true)
      })

      it('has index.tsx', () => {
        expect(existsSync(join(dir, 'index.tsx'))).toBe(true)
      })

      it('has examples.tsx', () => {
        expect(existsSync(join(dir, 'examples.tsx'))).toBe(true)
      })

      it('has contract.ts or contract.tsx', () => {
        const hasTs = existsSync(join(dir, 'contract.ts'))
        const hasTsx = existsSync(join(dir, 'contract.tsx'))
        expect(hasTs || hasTsx).toBe(true)
      })

      it('has contract.test.ts', () => {
        expect(existsSync(join(dir, 'contract.test.ts'))).toBe(true)
      })
    })
  }
})
```

- [ ] **Step 2:** Run.

```bash
bun test test/architecture/component-conventions.test.ts
```

Expected: failures for any USWDS-derived components that don't yet have `examples.tsx` (the inventory found 45 with `examples.tsx`, 47 with conformance specs — there are some gaps).

- [ ] **Step 3:** For each failing component, write a minimal `examples.tsx` (one `Default` export) and any missing `contract.test.ts`. Commit per component or per small batch.

  ```bash
  bun test test/architecture/component-conventions.test.ts
  # Identify failing components, fix them, repeat until green.
  ```

- [ ] **Step 4:** Run the full check.

```bash
bun run check
```

Expected: green.

- [ ] **Step 5:** Commit.

```bash
git add -A
git commit -m "test(architecture): require canonical files for every registered component

Adds test that every component in the registry has meta.ts, index.tsx,
examples.tsx, contract.{ts,tsx}, and contract.test.ts. Fills gaps for
components that were missing examples.tsx or contract.test.ts."
```

---

## Task 9: Update the catalog page to render kind-aware sections

**Files:**
- Modify: `src/entrypoints/app/routes/catalog/design-system.tsx`

- [ ] **Step 1:** Update the page header (around line 1209-1228 in current file). Replace the unconditional USWDS link with kind-aware rendering.

```tsx
<h1>{meta.name}</h1>

<div class="l-cluster">
  <span class="badge" data-variant="milestone">{meta.category}</span>
  <span class="badge" data-state={meta.kind === 'uswds-derived' ? 'closed' : 'open'}>
    {meta.kind === 'uswds-derived' ? 'USWDS-derived' : 'Custom'}
  </span>
  {meta.interactive && (
    <span class="badge" data-state="open">interactive</span>
  )}
</div>

<p>{meta.description}</p>

{meta.kind === 'uswds-derived' && meta.reference ? (
  <p>
    Reference:{' '}
    <a href={meta.reference} target="_blank" rel="noopener noreferrer">
      USWDS documentation ↗
    </a>
  </p>
) : (
  <p>Custom component — no upstream reference.</p>
)}
```

- [ ] **Step 2:** Rename the "Examples" section heading to "Variants". (Around line 1232.)

```diff
-          <h2>Examples</h2>
+          <h2>Variants</h2>
```

- [ ] **Step 3:** Rewrite the contract section to be kind-aware. Current code (lines 1262-1341) only renders the USWDS-style sub-sections; add a `custom` branch.

```tsx
{contract && (
  <section class="l-stack">
    <h2>Contract</h2>

    {contract.kind === 'uswds-derived' && (
      <>
        {contract.mapping.length > 0 && (
          <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
            <h3>Class mapping</h3>
            {/* existing table — unchanged */}
          </div>
        )}
        {contract.verified.length > 0 && (
          <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
            <h3>Verified properties</h3>
            {/* existing chip list — unchanged */}
          </div>
        )}
        {contract.intentionalDifferences.length > 0 && (
          <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
            <h3>Intentional differences</h3>
            {/* existing callouts — unchanged */}
          </div>
        )}
      </>
    )}

    {contract.kind === 'custom' && (
      <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
        <h3>Documented variants</h3>
        <ul>
          {contract.variants.map((v) => (
            <li>
              <strong>{v.name}</strong> — {v.description}
            </li>
          ))}
        </ul>
      </div>
    )}

    {contract.behavior.length > 0 && (
      <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
        <h3>Behavior promises</h3>
        <ul>
          {contract.behavior.map((b) => (
            <li>{b.tested ? '✓' : '○'} {b.description}</li>
          ))}
        </ul>
      </div>
    )}
  </section>
)}
```

- [ ] **Step 4:** Add a kind filter to the catalog index page (the `designSystem.get('/')` handler around line 47-152). Add a small toggle row above the foundations grid.

```tsx
<div class="l-cluster" style="--cluster-space: var(--flex-space-sm);">
  <span class="catalog-group-label">Filter:</span>
  <a href={resolveUrl('/catalog/design-system')}>All</a>
  <a href={resolveUrl('/catalog/design-system?kind=uswds-derived')}>USWDS-derived</a>
  <a href={resolveUrl('/catalog/design-system?kind=custom')}>Custom</a>
</div>
```

Read `c.req.query('kind')` and filter the rendered components accordingly. Each card also shows the kind badge alongside the existing status badge.

- [ ] **Step 5:** Smoke-test the page in the dev server.

```bash
bun run dev
# Visit http://localhost:3000/catalog/design-system
# Visit http://localhost:3000/catalog/design-system/flex-button         (USWDS-derived)
# Visit http://localhost:3000/catalog/design-system/flex-spec-diff-browser  (custom)
# Visit http://localhost:3000/catalog/design-system?kind=custom
# Confirm: no broken USWDS link on custom pages, "Variants" heading present,
# "Contract" section adapts to kind, filter works.
```

- [ ] **Step 6:** Run the full check.

```bash
bun run check
```

Expected: green.

- [ ] **Step 7:** Commit.

```bash
git add src/entrypoints/app/routes/catalog/design-system.tsx
git commit -m "feat(catalog): kind-aware design-system page rendering

Header shows kind badge and conditional reference link. Examples section
renamed to Variants. Conformance section renamed to Contract with
kind-specific sub-sections. Catalog index has a kind filter."
```

---

## Task 10: Final verification and PR

- [ ] **Step 1:** Run the full check from a clean state.

```bash
bun run check
```

Expected: green.

- [ ] **Step 2:** Visually walk every component page in the dev server, spot-checking that USWDS-derived components are unchanged and custom components now render coherently.

- [ ] **Step 3:** Open the PR.

```bash
git push -u origin story-design-system-custom-components
gh pr create --base main \
  --title "feat(design-system): first-class support for custom components" \
  --body "$(cat <<'EOF'
## Summary

- Introduces `ComponentKind = 'uswds-derived' | 'custom'` on `ComponentMeta`; `uswds: string` becomes `reference?: string`, present only when kind is USWDS-derived.
- Renames the "Conformance" concept to "Contract" — file paths, type names, runner, catalog section heading. The `Contract` type is a discriminated union over `kind`.
- Adds `examples.tsx` and `contract.ts` for the seven registered custom components.
- A single `runContract(spec)` entry point switches on kind.
- New architecture tests enforce: (1) kind/reference consistency, (2) custom-component variant/example alignment, (3) required files for every registered component.
- Catalog page renders kind-aware: no broken "USWDS Documentation" link on custom components; sub-sections of the Contract section adapt to kind; index page has a kind filter.

## Spec & plan

- Design: `notes/2026-04-19-design-system-custom-components-design.md`
- Plan: `notes/2026-04-19-design-system-custom-components-plan.md`

## Test plan

- [x] `bun run check` passes (lint, type, tests)
- [x] Manual catalog walkthrough: USWDS-derived component pages unchanged
- [x] Manual catalog walkthrough: custom component pages render variants and contract
- [x] Catalog index filter works for All / USWDS-derived / Custom
EOF
)"
```

---

## Self-review checklist (run before claiming done)

- [ ] Spec coverage: every section of the design doc has at least one task in this plan. (Header → Task 4+9; Contract type → Task 1; Renames → Tasks 1-3; `examples.tsx` source-of-truth → Task 6; `runContract` → Task 2; Catalog presentation → Task 9; Architecture tests → Tasks 5, 7, 8; Migration order → matches Tasks 1-9.)
- [ ] No placeholders: no "TBD", "TODO", "implement later", or "similar to Task N" in any step.
- [ ] Type names consistent across tasks: `Contract`, `UswdsContract`, `CustomContract`, `PairedFixture`, `BehaviorPromise`, `VariantPromise`, `ComponentKind`, `runContract`.
- [ ] Every code step shows the actual code or the actual diff. Every command step shows the exact command and expected outcome.
