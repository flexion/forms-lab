/**
 * Conformance spec type — single source of truth for USWDS conformance.
 *
 * Read by: conformance tests (automated verification) and catalog
 * design-system route (human-readable documentation).
 *
 * IMPORTANT: When adding a new component, create a conformance-spec.ts
 * in the component directory. The generic test runner and catalog page
 * will automatically pick it up.
 */

export interface ConformanceFixture {
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

export interface BehaviorSpec {
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

export interface ConformanceSpec {
  /** USWDS component name (e.g., 'usa-button') */
  component: string
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
  fixtures: ConformanceFixture[]
  /** Behavioral expectations */
  behavior: BehaviorSpec[]
  /** Additional attributes to ignore beyond the defaults (class, data-testid, data-variant, etc.) */
  extraIgnoreAttributes?: string[]
  /** Additional box model keys to ignore beyond width/height */
  extraIgnoreBoxKeys?: string[]
  /** Custom HTML wrapper for accessibility audit (e.g., to include labels for inputs) */
  accessibilityFixtureHtml?: string
}
