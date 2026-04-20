// Storage service interface types.

import type {
  NewProjectIndex,
  ProjectIndex,
  ProjectStatus,
} from '../../types/models'

export interface CacheEntry {
  key: string
  model: string
  result: string
  createdAt: number
}

export interface CacheStore {
  get(key: string): CacheEntry | null
  set(key: string, model: string, result: string): void
}

export interface ProjectStore {
  create(project: NewProjectIndex): ProjectIndex
  get(id: string): ProjectIndex | null
  getBySlug(slug: string): ProjectIndex | null
  list(userId?: string): ProjectIndex[]
  update(
    id: string,
    changes: Partial<Pick<ProjectIndex, 'status' | 'error'>>,
  ): ProjectIndex
  delete(id: string): void
}
