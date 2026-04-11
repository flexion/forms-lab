/**
 * Core data model types for the Forms Lab platform
 */

// Re-export data-collection types from their new home
export type {
  DataCollectionSpec,
  DataRequirement,
  FieldCondition,
  FieldType,
  RequirementGroup,
  ValidationRule,
} from '../services/data-collection/types'

// Re-export form types from their new home
export type {
  FieldEntry,
  FormPage,
  FormProject,
  FormSession,
  FormSessionGateway,
  FormSpec,
  ResolvedForm,
  ResolvedPage,
  Submission,
  SubmissionGateway,
} from '../services/forms/types'

import type { DataCollectionSpec } from '../services/data-collection/types'
import type { FormSpec } from '../services/forms/types'

/**
 * Persona - User persona for catalog
 *
 * Represents a stakeholder who interacts with the system.
 */
export interface Persona {
  id: string
  name: string
  role: string
  description: string
  needs: string[]
  content: string // Full markdown content
}

/**
 * Decision - Architectural decision record
 */
export interface Decision {
  slug: string
  group: string
  title: string
  status: string
  tags: string[]
  decided: string
  content: string
}

/**
 * ArchitectureDoc - System architecture documentation
 */
export interface ArchitectureDoc {
  slug: string
  title: string
  status: string
  tags: string[]
  content: string
}

/**
 * Story - User story synced from GitHub Issues
 */
export interface Story {
  slug: string
  issue: number
  title: string
  milestone: string
  labels: string[]
  state: string
  syncedAt: string
  content: string
}

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
