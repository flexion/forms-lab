/**
 * Ingestion pipeline types — PDF extraction, project storage, confidence tracking
 */

import type { DataCollectionSpec } from '../data-collection/types'
import type { FormSpec } from '../forms/types'

/**
 * PDF Extraction types
 */
export interface ExtractionResult {
  spec: DataCollectionSpec
  formSpec: FormSpec
  confidence: FieldConfidence[]
}

export interface FieldConfidence {
  fieldId: string
  confidence: number // 0-1
  flags?: string[] // e.g., "ambiguous-type", "conditional-logic-unclear"
}

export interface ExtractionOptions {
  model?: string // Bedrock model ID, defaults to Sonnet
}

/**
 * Project status for async extraction tracking
 */
export type ProjectStatus = 'extracting' | 'ready' | 'error'

/**
 * StoredProject - Database representation of a FormProject
 *
 * Unlike FormProject (which nests specs), StoredProject stores
 * specs as JSON strings alongside status and metadata.
 */
export interface StoredProject {
  id: string
  name: string
  description: string
  status: ProjectStatus
  sourcePdf: Buffer
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  error: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface NewProject {
  name: string
  description: string
  sourcePdf: Buffer
  createdBy: string
}
