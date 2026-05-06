// Public interface for the activity service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export { trackLlmCall } from './instrumentation'
export type { LlmCallMetrics } from './instrumentation'
export { BEDROCK_PRICING, estimateCost } from './pricing'
export { createActivityStore } from './store'
export type {
  ActivityEvent,
  ActivityQuery,
  ActivityRow,
  ActivityStore,
  UsageSummary,
} from './types'
