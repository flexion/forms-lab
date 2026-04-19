// Public interface for the auth service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export {
  checkOrgMembership,
  checkRepoPermission,
  exchangeCodeForToken,
  fetchUserProfile,
  type GitHubUser,
} from './github-oauth'

export {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  decryptSession,
  encryptSession,
} from './session'

export type { SessionUser } from './types'
