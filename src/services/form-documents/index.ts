// Public interface for the form-documents service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type { BedrockExtractorOptions, PdfExtractor } from './extraction'
export {
  createBedrockPdfExtractor,
  createCachedPdfExtractor,
} from './extraction'
export { enumerateFields } from './field-mapping'
export { fillPdf } from './filling'
export { createMappingRegistry } from './mapping-registry'
export type {
  ExtractionOptions,
  ExtractionResult,
  FieldConfidence,
  FieldMapping,
  FillResult,
} from './types'
