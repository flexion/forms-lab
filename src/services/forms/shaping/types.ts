import type { DataCollectionSpec } from '../../data-collection/types'
import type { FormSpec } from '../types'

export interface FormShaper {
  shape(request: ShapingRequest): Promise<ShapingResult>
}

export interface ShapingRequest {
  intent: string
  currentFormSpec: FormSpec
  dataSpec: DataCollectionSpec
}

export interface ShapingResult {
  revisedFormSpec: FormSpec
  summary: string
}

export interface PageDiff {
  id: string
  title: string
  status: 'added' | 'removed' | 'moved' | 'modified' | 'unchanged'
  details?: string
}

export interface FormSpecDiff {
  summary: string
  pages: PageDiff[]
  hasChanges: boolean
}
