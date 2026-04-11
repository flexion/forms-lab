import type {
  DeploymentInfo,
  HealthStatus,
  ServiceStatus,
} from '../../types/deployment'

type CombinedHealth =
  | 'healthy'
  | 'unhealthy'
  | 'failed'
  | 'unknown'
  | 'inactive'

export function getCombinedHealthStatus(
  serviceStatus: ServiceStatus,
  healthStatus: HealthStatus,
): CombinedHealth {
  if (serviceStatus === 'failed') return 'failed'
  if (serviceStatus === 'inactive') return 'inactive'
  if (healthStatus === 'unhealthy') return 'unhealthy'
  if (healthStatus === 'unknown') return 'unknown'
  return 'healthy'
}

export function getCombinedHealthLabel(status: CombinedHealth): string {
  const labels: Record<CombinedHealth, string> = {
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    failed: 'Failed',
    unknown: 'Unknown',
    inactive: 'Inactive',
  }
  return labels[status]
}

export function relativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function HealthBadge({ deployment }: { deployment: DeploymentInfo }) {
  const status = getCombinedHealthStatus(
    deployment.service.status,
    deployment.health.status,
  )
  const label = getCombinedHealthLabel(status)

  const colorMap: Record<
    CombinedHealth,
    { bg: string; text: string; border: string }
  > = {
    healthy: {
      bg: 'var(--flex-color-success-lighter)',
      text: 'var(--flex-color-success-darker)',
      border: 'var(--flex-color-success)',
    },
    unhealthy: {
      bg: 'var(--flex-color-error-lighter)',
      text: 'var(--flex-color-error-darker)',
      border: 'var(--flex-color-error)',
    },
    failed: {
      bg: 'var(--flex-color-error-lighter)',
      text: 'var(--flex-color-error-darker)',
      border: 'var(--flex-color-error)',
    },
    unknown: {
      bg: 'var(--flex-color-warning-lighter)',
      text: 'var(--flex-color-warning-darker)',
      border: 'var(--flex-color-warning)',
    },
    inactive: {
      bg: 'var(--flex-color-base-lighter)',
      text: 'var(--flex-color-text-muted)',
      border: 'var(--flex-color-base)',
    },
  }

  const colors = colorMap[status]

  return (
    <span
      class="deployment-table__tag"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {label}
    </span>
  )
}

function PRCell({
  pullRequest,
}: {
  pullRequest: DeploymentInfo['pullRequest']
}) {
  if (!pullRequest) {
    return <span class="deployment-table__muted">No PR</span>
  }

  const tagColorMap: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    open: {
      bg: 'var(--flex-color-success-lighter)',
      text: 'var(--flex-color-success-darker)',
      border: 'var(--flex-color-success)',
    },
    merged: {
      bg: 'var(--flex-color-base-darker)',
      text: 'var(--flex-color-white)',
      border: 'var(--flex-color-base-darker)',
    },
    closed: {
      bg: 'var(--flex-color-base-lighter)',
      text: 'var(--flex-color-text-muted)',
      border: 'var(--flex-color-base)',
    },
  }

  const colors = tagColorMap[pullRequest.status] || tagColorMap.closed

  return (
    <span class="deployment-table__pr">
      <a
        href={pullRequest.url}
        target="_blank"
        rel="noopener noreferrer"
        class="deployment-table__link"
      >
        #{pullRequest.number}
      </a>
      <span
        class="deployment-table__tag"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
        }}
      >
        {pullRequest.status}
      </span>
    </span>
  )
}

function DeploymentRow({ deployment }: { deployment: DeploymentInfo }) {
  const { branch, url, commit, service, health, pullRequest } = deployment
  const time = relativeTime(commit.date)

  const hasDetail =
    commit.message.length > 50 ||
    (health.error && health.status !== 'healthy') ||
    service.uptime ||
    health.responseTime

  return (
    <details class="deployment-table__row">
      <summary class="deployment-table__summary">
        <span class="deployment-table__cell" data-label="Branch">
          <a href={url} class="deployment-table__link deployment-table__branch">
            {branch}
          </a>
        </span>
        <span class="deployment-table__cell" data-label="Last Updated">
          <time
            datetime={commit.date}
            title={new Date(commit.date).toLocaleString()}
          >
            {time}
          </time>
        </span>
        <span class="deployment-table__cell" data-label="Commit">
          <a
            href={commit.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="deployment-table__link deployment-table__sha"
          >
            {commit.shortSha}
          </a>
          <span class="deployment-table__commit-msg" title={commit.message}>
            {commit.message}
          </span>
          <span class="deployment-table__muted">{commit.author}</span>
        </span>
        <span class="deployment-table__cell" data-label="PR">
          <PRCell pullRequest={pullRequest} />
        </span>
        <span class="deployment-table__cell" data-label="Health">
          <HealthBadge deployment={deployment} />
        </span>
      </summary>
      {hasDetail && (
        <div class="deployment-table__detail">
          <dl class="deployment-table__detail-list">
            {commit.message.length > 50 && (
              <>
                <dt>Full commit message</dt>
                <dd>{commit.message}</dd>
              </>
            )}
            {health.error && health.status !== 'healthy' && (
              <>
                <dt>Health error</dt>
                <dd class="deployment-table__error">{health.error}</dd>
              </>
            )}
            {service.uptime && (
              <>
                <dt>Uptime</dt>
                <dd>{service.uptime}</dd>
              </>
            )}
            {health.responseTime && (
              <>
                <dt>Response time</dt>
                <dd>{health.responseTime}ms</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </details>
  )
}

export function DeploymentTable({
  deployments,
}: {
  deployments: DeploymentInfo[]
}) {
  if (deployments.length === 0) {
    return <p>No branches currently deployed.</p>
  }

  return (
    <div class="deployment-table">
      <div class="deployment-table__header" aria-hidden="true">
        <span class="deployment-table__cell" />
        <span class="deployment-table__cell">Branch</span>
        <span class="deployment-table__cell">Last Updated</span>
        <span class="deployment-table__cell">Commit</span>
        <span class="deployment-table__cell">PR</span>
        <span class="deployment-table__cell">Health</span>
      </div>
      {deployments.map((deployment) => (
        <DeploymentRow key={deployment.branch} deployment={deployment} />
      ))}
    </div>
  )
}
