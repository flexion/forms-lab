import type { Task } from './types'

export interface ProvenanceEntry {
  variantId: string
  modelId?: string
  timestamp: string
  specVersion?: string
}

export type ProvenanceFile = Partial<Record<Task, ProvenanceEntry[]>>

export function appendProvenance(
  existing: ProvenanceFile | null,
  task: Task,
  entry: ProvenanceEntry,
): ProvenanceFile {
  const base: ProvenanceFile = existing ? { ...existing } : {}
  const prior = base[task] ?? []
  base[task] = [...prior, entry]
  return base
}

export function readProvenance(
  file: ProvenanceFile | null,
  task: Task,
): ProvenanceEntry | null {
  if (!file) return null
  const entries = file[task]
  if (!entries || entries.length === 0) return null
  return entries[entries.length - 1] ?? null
}
