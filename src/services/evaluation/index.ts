// Public interface for the evaluation service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export {
  fixtureProjectState,
  shapingIntentFixtures,
} from './fixtures/shaping-intents'
export { runEvaluation } from './harness'
export { createBedrockFieldJudge } from './judge'
export { pdfFieldExtractionKind } from './kinds/pdf-field-extraction'
export { createLlmJudgeKind } from './kinds/pdf-field-extraction-judge'
export { shapingCommandsKind } from './kinds/shaping-commands'
export { evaluationRunSchema } from './schemas'
export type { RunResult } from './types'
