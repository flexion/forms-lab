export interface ActivityEvent {
  eventType: string
  userId?: string
  projectId?: string
  operation?: string
  metadata?: Record<string, unknown>
}

export interface ActivityQuery {
  from?: number
  to?: number
  userId?: string
  projectId?: string
  eventType?: string
  operation?: string
  limit?: number
}

export interface ActivityRow {
  id: number
  timestamp: number
  eventType: string
  userId: string | null
  projectId: string | null
  operation: string | null
  metadata: Record<string, unknown>
}

export interface UsageSummary {
  totalEvents: number
  estimatedCost: number
  byUser: Array<{
    userId: string
    events: number
    tokens: number
    cost: number
  }>
  byOperation: Array<{
    operation: string
    events: number
    tokens: number
    cost: number
  }>
  byProject: Array<{ projectId: string; events: number; cost: number }>
}

export interface ActivityStore {
  track(event: ActivityEvent): void
  query(filters: ActivityQuery): ActivityRow[]
  summarize(period: { from: number; to: number }): UsageSummary
}
