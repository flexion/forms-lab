// Public interface for the auth service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type {
  AccessEntry,
  AccessSource,
  AccessStatus,
  AccessStore,
} from './access-store'
export { createAccessStore } from './access-store'
export {
  checkOrgMembership,
  checkRepoPermission,
  exchangeCodeForToken,
  fetchUserEmails,
  fetchUserProfile,
  type GitHubEmail,
  type GitHubUser,
  hasAllowedEmailDomain,
} from './github-oauth'
export {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  decryptSession,
  encryptSession,
} from './session'
export type { SessionUser } from './types'
export type { UserStore } from './user-store'
export { createUserStore } from './user-store'
