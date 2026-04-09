/**
 * Core data model types for the Forms Lab platform
 */

/**
 * DataCollectionSpec - Business domain model
 *
 * Describes what data to collect: fields, types, constraints, conditions,
 * sensitivity, help text. Semantic, not presentational. Portable across
 * delivery modes.
 */
export interface DataCollectionSpec {
  id: string
  title: string
  description: string
  groups: RequirementGroup[]
  version?: string
}

export interface RequirementGroup {
  id: string
  title: string
  description?: string
  requirements: DataRequirement[]
}

export interface DataRequirement {
  id: string
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  validation?: ValidationRule[]
  condition?: Condition
  sensitivity?: SensitivityLevel
}

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'currency'
  | 'date'
  | 'boolean'
  | 'choice'
  | 'longText'

export interface ValidationRule {
  type: 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength'
  value: string | number
  message?: string
}

export interface Condition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string | number | boolean
}

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'pii'

/**
 * FormSpec - UX/delivery layer
 *
 * Describes how to present a DataCollectionSpec as a form experience:
 * page flow, section ordering, progressive disclosure, delivery mode per
 * section, layout hints, help text strategy.
 */
export interface FormSpec {
  id: string
  specId: string // References DataCollectionSpec
  title: string
  pages: FormPage[]
  createdAt: string
  updatedAt: string
}

export interface FormPage {
  id: string
  title: string
  description?: string
  groups: string[] // References RequirementGroup ids
  deliveryMode: DeliveryMode
}

export type DeliveryMode = 'static' | 'conversational' | 'hybrid'

/**
 * Submission - Immutable collected data
 *
 * Validated data collected against a specific DataCollectionSpec version
 * (identified by git SHA). Lives outside spec repo. Links back to exact
 * spec state at collection time.
 */
export interface Submission {
  id: string
  specId: string
  specVersion: string // git SHA
  data: Record<string, unknown>
  submittedAt: string
  status: SubmissionStatus
}

export type SubmissionStatus = 'draft' | 'submitted' | 'processed'

/**
 * FormProject - Directory in git containing specs and assets
 *
 * The unit of collaboration. Contains DataCollectionSpec, FormSpecs,
 * and associated assets (source PDF, policy docs, delivery config).
 */
export interface FormProject {
  id: string
  name: string
  description: string
  spec: DataCollectionSpec
  formSpecs: FormSpec[]
  createdAt: string
  updatedAt: string
}

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
