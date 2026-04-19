// Public interface for the deployment service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type {
  DeploymentState,
  GitHubClient,
  GitHubDeployment,
  GitHubIssue,
  GitHubPullRequest,
} from './github'
export {
  createGitHubClient,
  getGitHubToken,
} from './github'
export type { GroupedDeployments } from './metadata'
export {
  getDeploymentInfo,
  getDeploymentSummary,
  groupDeploymentsByStatus,
  sortDeploymentsByDate,
} from './metadata'

export type {
  DeploymentInfo,
  DeploymentSummary,
  HealthStatus,
  PullRequestStatus,
  ServiceStatus,
} from './types'
