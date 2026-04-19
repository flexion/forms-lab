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
