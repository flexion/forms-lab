/**
 * Form domain types — how to present and collect data
 */

import type {
  DataCollectionSpec,
  FieldCondition,
  RequirementGroup,
} from '../data-collection/types'

export type DeliveryMode = 'static' | 'conversational' | 'hybrid'

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
  deliveryMode?: DeliveryMode
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
  createSession(
    specId: string,
    formSpecId: string,
    ownerId: string,
  ): FormSession
  getSession(id: string): FormSession | null
  listByOwner(ownerId: string): FormSession[]
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
