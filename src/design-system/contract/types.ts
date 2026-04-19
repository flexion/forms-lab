/**
 * Contract type — single source of truth for component verification.
 *
 * Read by: contract tests (automated verification via runContract) and the
 * catalog design-system route (human-readable documentation).
 *
 * Discriminated on `kind`:
 * - 'uswds-derived': visual computed-style diff against a USWDS reference
 *   plus an axe audit.
 * - 'custom':        renders every export from the component's examples.tsx
 *   and runs an axe audit (no upstream reference).
 *
 * IMPORTANT: When adding a new component, create a contract.ts (or .tsx)
 * in the component directory and a sibling contract.test.ts that calls
 * runContract(spec). The catalog page picks it up automatically.
 */

export type ComponentKind = 'uswds-derived' | 'custom'

export interface FixtureInteraction {
  /** The user action to simulate before extracting styles */
  action: 'hover' | 'focus' | 'click'
  /** CSS selector for the USWDS element to interact with */
  uswdsSelector: string
  /** CSS selector for the flex element to interact with */
  flexSelector: string
}

export interface PairedFixture {
  /** Human-readable name for this variant/state combination */
  name: string
  /** USWDS reference HTML */
  uswds: string
  /** Our flex-* HTML */
  flex: string
  /** CSS selector for the USWDS target element (default: [data-testid="target"]) */
  uswdsSelector?: string
  /** CSS selector for the flex target element (default: [data-testid="target"]) */
  flexSelector?: string
  /**
   * Optional interaction to trigger before extracting styles.
   * Use this to test hover, focus, or click states.
   * The runner triggers the action on both USWDS and flex elements,
   * then extracts and diffs the full computed styles.
   */
  interaction?: FixtureInteraction
}

export interface IntentionalDifference {
  /** CSS property name */
  property: string
  /** Our computed value */
  ours: string
  /** USWDS computed value */
  uswds: string
  /** Why we intentionally differ */
  reason: string
}

export interface BehaviorPromise {
  /** What the behavior is */
  description: string
  /** Whether an automated test covers this */
  tested: boolean
}

export interface ClassMapping {
  /** USWDS class or pattern */
  uswds: string
  /** Our class or attribute */
  flex: string
  /** What this maps */
  notes: string
}

export interface VariantPromise {
  /** Must match the named export in examples.tsx exactly. */
  name: string
  /** Human-readable description shown on the catalog page. */
  description: string
}

interface BaseContract {
  /** USWDS component name (e.g., 'usa-button') */
  component: string
  /** Behavioral expectations */
  behavior: BehaviorPromise[]
  /** Custom HTML wrapper for accessibility audit (e.g., to include labels for inputs) */
  accessibilityFixtureHtml?: string
}

export interface UswdsContract extends BaseContract {
  kind: 'uswds-derived'
  /** Link to USWDS documentation */
  reference: string
  /** How USWDS classes map to our data attributes */
  mapping: ClassMapping[]
  /** CSS properties verified to match USWDS */
  verified: string[]
  /** Properties ignored during comparison (structural artifacts, not design choices) */
  structuralIgnores: string[]
  /** Properties we intentionally differ on, with reasons */
  intentionalDifferences: IntentionalDifference[]
  /** HTML fixture pairs for visual conformance testing */
  fixtures: PairedFixture[]
  /** Additional attributes to ignore beyond the defaults (class, data-testid, data-variant, etc.) */
  extraIgnoreAttributes?: string[]
  /** Additional box model keys to ignore beyond width/height */
  extraIgnoreBoxKeys?: string[]
}

export interface CustomContract extends BaseContract {
  kind: 'custom'
  /** Named exports from examples.tsx with human-readable descriptions */
  variants: VariantPromise[]
}

export type Contract = UswdsContract | CustomContract
