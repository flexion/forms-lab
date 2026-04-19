// src/services/variant-preferences/index.ts
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
