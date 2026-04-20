// Public interface for the evaluation service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

// Fixtures
export {
  fixtureProjectState,
  shapingIntentFixtures,
} from './fixtures/shaping-intents'
// Harness
export { runEvaluation } from './harness'
// Judges
export { createBedrockFieldJudge } from './judge'
// Kinds
export {
  type ExtractionOutput,
  pdfFieldExtractionKind,
} from './kinds/pdf-field-extraction'
export { createLlmJudgeKind } from './kinds/pdf-field-extraction-judge'
export { shapingCommandsKind } from './kinds/shaping-commands'
export { evaluationRunSchema } from './schemas'
export type { RunResult } from './types'
