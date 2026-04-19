// Public interface for the evaluation service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export {
  fixtureProjectState,
  type ShapingIntentFixture,
  shapingIntentFixtures,
} from './fixtures/shaping-intents'
export {
  type EvaluationFixture,
  type RunOptions,
  runEvaluation,
} from './harness'
export { createBedrockFieldJudge, type FieldJudge } from './judge'
export { buildJudgePrompt } from './judge-prompt'
export {
  type JudgeMatch,
  type JudgeResponse,
  judgeMatchSchema,
  judgeResponseSchema,
} from './judge-schemas'
export { pdfFieldExtractionKind } from './kinds/pdf-field-extraction'
export { createLlmJudgeKind } from './kinds/pdf-field-extraction-judge'
export {
  type ShapingGroundTruth,
  type ShapingOutput,
  shapingCommandsKind,
} from './kinds/shaping-commands'
export {
  calculateMetrics,
  type ExtractionOutput,
  type FlatField,
  flattenFields,
} from './kinds/shared'
export {
  type EvaluationRun,
  evaluationRunSchema,
  type FixtureManifest,
  fixtureManifestSchema,
} from './schemas'
export type {
  CaseMetrics,
  EvaluationKind,
  RunResult,
  SummaryMetrics,
} from './types'
