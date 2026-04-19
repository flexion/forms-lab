// Public interface for the projects service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type {
  BranchEntry,
  CommitEntry,
  FileEntry,
  FormProjectRepo,
  MergeResult,
  TreeEntry,
} from './form-project-repo'
export { createFormProjectRepo } from './form-project-repo'
export type {
  ExtractionContext,
  ProjectService,
  ProjectView,
  ShapingLogEntry,
} from './project-service'
export { createProjectService } from './project-service'
