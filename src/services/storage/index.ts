// Public interface for the storage service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export { createCacheStore } from './sqlite-cache-store'
export { createProjectStore } from './sqlite-project-store'
export type { CacheEntry, CacheStore, ProjectStore } from './types'
