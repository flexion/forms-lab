import type { DataCollectionSpec } from '../../data-collection'
import type { FormSpec } from '../types'
import { diffDataCollectionSpecs } from './data-collection-spec-differ'
import { diffFormSpecs } from './form-spec-differ'
import type { SpecChange } from './types'

export interface SpecSnapshot {
  dataSpec: DataCollectionSpec
  formSpec: FormSpec
}

export function compareSpecs(
  base: SpecSnapshot,
  head: SpecSnapshot,
): SpecChange[] {
  return [
    ...diffDataCollectionSpecs(base.dataSpec, head.dataSpec),
    ...diffFormSpecs(base.formSpec, head.formSpec),
  ]
}

export type { ChangeCategory, ChangeResource, SpecChange } from './types'
