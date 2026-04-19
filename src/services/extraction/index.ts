// Public interface for the extraction service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type { ExtractionExemplar } from './exemplars'
export { exemplars } from './exemplars'

export {
  HAIKU_MODEL_ID,
  NOVA_PRO_MODEL_ID,
  OPUS_MODEL_ID,
  SONNET_MODEL_ID,
} from './models'

export { createExtractorRegistry } from './registry'
