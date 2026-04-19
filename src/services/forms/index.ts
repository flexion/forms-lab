// Public interface for the forms service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.
//
// Organized into logical groups: comparison, filling, navigation, resolver,
// review, shaping, sessions/submissions, and types. Biome's organizeImports
// sorts declarations alphabetically by source module within the file, so the
// order below is driven by module path rather than conceptual grouping.

export type { ChangeCategory, ChangeResource, SpecChange } from './comparison'
export { compareSpecs } from './comparison'
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
export {
  countVisiblePages,
  findNextPage,
  findPrevPage,
  visiblePageNumber,
} from './navigation'
export { evaluateCondition, resolveFormSpec } from './resolver'
export type { Comment, ReviewService } from './review'
export { createReviewService } from './review'
export type { Command, ProjectState } from './shaping/commands'
export { commandSchema } from './shaping/commands'
export { executeBatch } from './shaping/executor'
export { humanize } from './shaping/humanize'
export { createShapingRegistry } from './shaping/registry'
export { commandTools } from './shaping/tools'
export type { FormShaper } from './shaping/types'
export { createSpecSnapshotStore } from './spec-snapshot-store'
export { SqliteFormSessionGateway } from './sqlite-session-gateway'
export { SqliteSubmissionGateway } from './sqlite-submission-gateway'
export type {
  FieldEntry,
  FormPage,
  FormSessionGateway,
  FormSpec,
  SubmissionGateway,
} from './types'
export { validateFields } from './validation'
