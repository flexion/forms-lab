/**
 * Core data model types for the Forms Lab platform
 */

// Re-export content types from their new home
export type {
  ArchitectureDoc,
  Decision,
  Persona,
  Story,
} from '../services/content/types'
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
