import type { ActivityStore } from './types'

export interface LlmCallMetrics {
  userId?: string
  projectId?: string
  operation: string
  model: string
  usage: {
    inputTokens?: number | undefined
    outputTokens?: number | undefined
  }
  durationMs: number
}

/** Fire-and-forget helper for tracking an LLM call. */
export function trackLlmCall(
  store: ActivityStore,
  metrics: LlmCallMetrics,
): void {
  store.track({
    eventType: 'llm_call',
    userId: metrics.userId,
    projectId: metrics.projectId,
    operation: metrics.operation,
    metadata: {
      model: metrics.model,
      inputTokens: metrics.usage.inputTokens ?? 0,
      outputTokens: metrics.usage.outputTokens ?? 0,
      durationMs: metrics.durationMs,
    },
  })
}
