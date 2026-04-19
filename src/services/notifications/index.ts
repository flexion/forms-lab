// Public interface for the notifications service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export { notifyEvent } from './client'
export type { NotifyEvent, NotifyStatus } from './types'
export { validateEvent } from './types'
