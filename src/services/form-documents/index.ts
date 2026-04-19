// Public interface for the form-documents service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type { BedrockExtractorOptions, PdfExtractor } from './extraction'
export {
  buildExemplarSection,
  createBedrockPdfExtractor,
  createCachedPdfExtractor,
} from './extraction'
export {
  extractionTools,
  type ReconstructedExtraction,
  reconstructSpec,
} from './extraction-tools'
export { enumerateFields } from './field-mapping'
export { fillPdf } from './filling'
export { createMappingRegistry } from './mapping-registry'
export { dataCollectionSpecSchema } from './schemas'
export type {
  ExtractionOptions,
  ExtractionResult,
  FieldConfidence,
  FieldMapping,
  FillResult,
} from './types'
