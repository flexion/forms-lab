export interface EvaluationKind<TOutput, TGroundTruth> {
  id: string
  description: string
  score(output: TOutput, groundTruth: TGroundTruth): Promise<CaseMetrics>
  summarize(cases: CaseMetrics[]): SummaryMetrics
}

export interface CaseMetrics {
  fixture: string
  metrics: Record<string, number>
  details: Record<string, unknown>
}

export interface SummaryMetrics {
  metrics: Record<string, number>
}

export interface RunResult {
  kind: string
  implementation: string
  specVersion: string
  status: 'current' | 'archived'
  timestamp: string
  model: string
  summary: Record<string, number>
  cases: Array<{
    fixture: string
    metrics: Record<string, number>
    details: Record<string, unknown>
  }>
  archivedReason?: string
}
