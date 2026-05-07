import { Database } from 'bun:sqlite'
import { estimateCost } from './pricing'
import type {
  ActivityEvent,
  ActivityQuery,
  ActivityRow,
  ActivityStore,
  UsageSummary,
} from './types'

export function createActivityStore(dbPath: string): ActivityStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      user_id TEXT,
      project_id TEXT,
      operation TEXT,
      metadata TEXT
    )
  `)

  return {
    track(event: ActivityEvent): void {
      try {
        db.run(
          `INSERT INTO activity_events (timestamp, event_type, user_id, project_id, operation, metadata)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            Math.floor(Date.now() / 1000),
            event.eventType,
            event.userId ?? null,
            event.projectId ?? null,
            event.operation ?? null,
            event.metadata ? JSON.stringify(event.metadata) : null,
          ],
        )
      } catch (err) {
        console.error('[activity] Failed to track event:', err)
      }
    },

    query(filters: ActivityQuery): ActivityRow[] {
      const conditions: string[] = []
      const params: (string | number)[] = []

      if (filters.from !== undefined) {
        conditions.push('timestamp >= ?')
        params.push(filters.from)
      }
      if (filters.to !== undefined) {
        conditions.push('timestamp <= ?')
        params.push(filters.to)
      }
      if (filters.userId) {
        conditions.push('user_id = ?')
        params.push(filters.userId)
      }
      if (filters.projectId) {
        conditions.push('project_id = ?')
        params.push(filters.projectId)
      }
      if (filters.eventType) {
        conditions.push('event_type = ?')
        params.push(filters.eventType)
      }
      if (filters.operation) {
        conditions.push('operation = ?')
        params.push(filters.operation)
      }

      const where =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      if (filters.limit) {
        params.push(filters.limit)
      }
      const sql = `SELECT * FROM activity_events ${where} ORDER BY timestamp DESC${filters.limit ? ' LIMIT ?' : ''}`

      const rows = db.query(sql).all(...params) as Array<
        Record<string, unknown>
      >
      return rows.map((row) => ({
        id: row.id as number,
        timestamp: row.timestamp as number,
        eventType: row.event_type as string,
        userId: row.user_id as string | null,
        projectId: row.project_id as string | null,
        operation: row.operation as string | null,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
      }))
    },

    summarize(period: { from: number; to: number }): UsageSummary {
      const events = this.query({ from: period.from, to: period.to })

      const byUserMap = new Map<
        string,
        { events: number; tokens: number; cost: number }
      >()
      const byOpMap = new Map<
        string,
        { events: number; tokens: number; cost: number }
      >()
      const byProjectMap = new Map<string, { events: number; cost: number }>()
      let totalCost = 0

      for (const event of events) {
        const userId = event.userId ?? 'system'
        const userEntry = byUserMap.get(userId) ?? {
          events: 0,
          tokens: 0,
          cost: 0,
        }
        userEntry.events++

        const projEntry = event.projectId
          ? (byProjectMap.get(event.projectId) ?? { events: 0, cost: 0 })
          : null
        if (projEntry) {
          projEntry.events++
        }

        if (event.eventType === 'llm_call' && event.metadata) {
          const model = event.metadata.model as string | undefined
          const inputTokens = (event.metadata.inputTokens as number) ?? 0
          const outputTokens = (event.metadata.outputTokens as number) ?? 0
          const tokens = inputTokens + outputTokens
          const cost = model
            ? estimateCost(model, inputTokens, outputTokens)
            : 0

          userEntry.tokens += tokens
          userEntry.cost += cost
          totalCost += cost

          const op = event.operation ?? 'unknown'
          const opEntry = byOpMap.get(op) ?? { events: 0, tokens: 0, cost: 0 }
          opEntry.events++
          opEntry.tokens += tokens
          opEntry.cost += cost
          byOpMap.set(op, opEntry)

          if (projEntry) {
            projEntry.cost += cost
          }
        }

        if (event.projectId && projEntry) {
          byProjectMap.set(event.projectId, projEntry)
        }

        byUserMap.set(userId, userEntry)
      }

      return {
        totalEvents: events.length,
        estimatedCost: totalCost,
        byUser: [...byUserMap.entries()].map(([userId, data]) => ({
          userId,
          ...data,
        })),
        byOperation: [...byOpMap.entries()].map(([operation, data]) => ({
          operation,
          ...data,
        })),
        byProject: [...byProjectMap.entries()].map(([projectId, data]) => ({
          projectId,
          ...data,
        })),
      }
    },
  }
}
