export type ChangeCategory =
  | 'added'
  | 'removed'
  | 'modified'
  | 'moved'
  | 'renamed'

export type ChangeResource = 'data-collection-spec' | 'form-spec'

export interface SpecChange {
  category: ChangeCategory
  resource: ChangeResource
  // Hierarchical path: e.g., ['page:abc', 'group:xyz', 'field:zip']
  path: string[]
  // Human-readable description, e.g., "Added page 'Military Service'"
  description: string
  // Optional extra context (field counts, from/to values)
  details?: Record<string, unknown>
}
