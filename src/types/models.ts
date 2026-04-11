/**
 * Core data model types for the Forms Lab platform
 */

// --- Data Collection Layer (what to collect) ---

export interface DataCollectionSpec {
  id: string
  title: string
  description: string
  groups: RequirementGroup[]
}

export interface RequirementGroup {
  id: string
  title: string
  description?: string
  requirements: DataRequirement[]
  condition?: FieldCondition
}

export interface DataRequirement {
  id: string
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  validation?: ValidationRule[]
  condition?: FieldCondition
  displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
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

export interface FieldCondition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string | number | boolean
}

// --- Form Spec Layer (how to present) ---

export interface FormSpec {
  id: string
  specId: string
  title: string
  description?: string
  pages: FormPage[]
}

export interface FormPage {
  id: string
  title: string
  description?: string
  groups: string[]
  condition?: FieldCondition
}

// --- Resolution Layer ---

export interface ResolvedForm {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
  pages: ResolvedPage[]
}

export interface ResolvedPage {
  page: FormPage
  groups: RequirementGroup[]
}

// --- Session & Submission ---

export interface FormSession {
  id: string
  specId: string
  formSpecId: string
  ownerId: string
  fields: Record<string, FieldEntry>
  status: 'active' | 'submitted'
  createdAt: string
}

export interface FieldEntry {
  value: string | number | boolean | null
  errors?: string[]
}

export interface Submission {
  id: string
  specId: string
  formSpecId: string
  ownerId: string
  data: Record<string, unknown>
  submittedAt: string
}

// --- Persistence Gateways ---

export interface FormSessionGateway {
  createSession(specId: string, formSpecId: string, ownerId: string): FormSession
  getSession(id: string): FormSession | null
  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void
  submit(sessionId: string): Submission
}

export interface SubmissionGateway {
  save(submission: Submission): void
  getSubmission(id: string): Submission | null
}

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
