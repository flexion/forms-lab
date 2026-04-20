// Public interface for the forms service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

// Comparison
export type { ChangeCategory, ChangeResource, SpecChange } from './comparison'
export { compareSpecs } from './comparison'
// Filling
export { createFillingRegistry } from './filling/registry'
export {
  BedrockFillingAgent,
  ScriptedFillingAgent,
  SqliteConversationGateway,
} from './filling-agent'
export type {
  ConversationGateway,
  FillingAgent,
} from './filling-agent/types'

// Navigation
export {
  countVisiblePages,
  findNextPage,
  findPrevPage,
  visiblePageNumber,
} from './navigation'
// Resolver & Validation
export { evaluateCondition, resolveFormSpec } from './resolver'
// Review
export type { Comment, ReviewService } from './review'
export { createReviewService } from './review'

// Shaping
export type { Command, ProjectState } from './shaping/commands'
export { commandSchema } from './shaping/commands'
export { executeBatch } from './shaping/executor'
export { composeExplanation, humanize } from './shaping/humanize'
export { createShapingRegistry } from './shaping/registry'
export { commandTools } from './shaping/tools'
export type { FormShaper } from './shaping/types'
// Storage & Sessions
export { createSpecSnapshotStore } from './spec-snapshot-store'
export { SqliteFormSessionGateway } from './sqlite-session-gateway'
export { SqliteSubmissionGateway } from './sqlite-submission-gateway'
// Core Types
export type {
  FieldEntry,
  FormPage,
  FormSessionGateway,
  FormSpec,
  SubmissionGateway,
} from './types'
export { validateFields } from './validation'

// Visibility
export { buildReviewPages, filterVisibleGroups } from './visibility'
