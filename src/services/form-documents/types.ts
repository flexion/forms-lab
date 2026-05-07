/**
 * Ingestion pipeline types — PDF extraction, project storage, confidence tracking
 */

import type { DataCollectionSpec } from '../data-collection'
import type { FormSpec } from '../forms'

/**
 * Maps DataCollectionSpec fieldNames to PDF AcroForm field names.
 * Key: spec fieldName (camelCase, e.g. "firstName")
 * Value: PDF form field name (e.g. "First Name" or "topmostSubform[0].f1_01[0]")
 */
export type FieldMapping = Record<string, string>

export interface FillResult {
  pdf: Uint8Array
  unmappedFields: string[]
  emptyFields: string[]
}

/**
 * PDF Extraction types
 */
export interface ExtractionResult {
  spec: DataCollectionSpec
  formSpec: FormSpec
  confidence: FieldConfidence[]
  fieldMapping: FieldMapping
}

export interface FieldConfidence {
  fieldId: string
  confidence: number // 0-1
  flags?: string[] // e.g., "ambiguous-type", "conditional-logic-unclear"
}

export interface ExtractionOptions {
  model?: string // Bedrock model ID, defaults to Sonnet
  /**
   * Fixture slug, used as the retrieval query for RAG-enabled
   * extractors. Optional because non-RAG variants ignore it.
   */
  slug?: string
  /** User login for activity tracking. */
  userId?: string
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
  strategy: string
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
  strategy: string
  sourcePdf: Buffer
  createdBy: string
}
