// Public interface for the variant-preferences service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export {
  appendProvenance,
  type ProvenanceEntry,
  type ProvenanceFile,
  readProvenance,
} from './provenance'
export {
  createVariantPreferencesService,
  type TaskRegistries,
  type VariantPreferencesService,
} from './service'
export { createVariantPreferencesGateway } from './sqlite-gateway'
export {
  isTask,
  TASKS,
  type Task,
  type VariantPreference,
  type VariantPreferencesGateway,
} from './types'
