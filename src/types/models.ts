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

// Re-export ingestion types from their new home
export type {
  ExtractionOptions,
  ExtractionResult,
  FieldConfidence,
  NewProject,
  ProjectStatus,
  StoredProject,
} from '../services/ingestion/types'

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
