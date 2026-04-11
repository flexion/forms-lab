export interface StrategyMetadata {
  name: string
  description: string
  status: 'baseline' | 'experimental' | 'production'
  courseTopics: string[]
  catalogPath?: string
  modelId?: string
  metrics?: Record<string, number>
}

export interface StrategyEntry<T> {
  id: string
  metadata: StrategyMetadata
  create: () => T
}

export interface StrategyListItem {
  id: string
  metadata: StrategyMetadata
}

export class StrategyRegistry<T> {
  private entries = new Map<string, StrategyEntry<T>>()
  private defaultId: string | null = null

  register(entry: StrategyEntry<T>): void {
    this.entries.set(entry.id, entry)
    if (this.defaultId === null) {
      this.defaultId = entry.id
    }
  }

  get(id: string): T {
    const entry = this.entries.get(id)
    if (!entry) throw new Error(`Unknown strategy: ${id}`)
    return entry.create()
  }

  getDefault(): T {
    if (this.defaultId === null) throw new Error('No strategies registered')
    return this.get(this.defaultId)
  }

  getDefaultId(): string {
    if (this.defaultId === null) throw new Error('No strategies registered')
    return this.defaultId
  }

  setDefault(id: string): void {
    if (!this.entries.has(id)) throw new Error(`Unknown strategy: ${id}`)
    this.defaultId = id
  }

  list(): StrategyListItem[] {
    return Array.from(this.entries.entries()).map(([id, entry]) => ({
      id,
      metadata: entry.metadata,
    }))
  }
}
