import type { DeploymentInfo } from '../../types/deployment'

interface DeploymentCardProps {
  deployment: DeploymentInfo
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> =
    {
      running: {
        bg: 'var(--flex-color-success-lighter)',
        text: 'var(--flex-color-success-darker)',
        border: 'var(--flex-color-success)',
      },
      healthy: {
        bg: 'var(--flex-color-success-lighter)',
        text: 'var(--flex-color-success-darker)',
        border: 'var(--flex-color-success)',
      },
      failed: {
        bg: 'var(--flex-color-error-lighter)',
        text: 'var(--flex-color-error-darker)',
        border: 'var(--flex-color-error)',
      },
      unhealthy: {
        bg: 'var(--flex-color-error-lighter)',
        text: 'var(--flex-color-error-darker)',
        border: 'var(--flex-color-error)',
      },
      inactive: {
        bg: 'var(--flex-color-base-lighter)',
        text: 'var(--flex-color-text-muted)',
        border: 'var(--flex-color-base)',
      },
      unknown: {
        bg: 'var(--flex-color-warning-lighter)',
        text: 'var(--flex-color-warning-darker)',
        border: 'var(--flex-color-warning)',
      },
      restarting: {
        bg: 'var(--flex-color-info-lighter)',
        text: 'var(--flex-color-info-darker)',
        border: 'var(--flex-color-info)',
      },
    }

  const colors = colorMap[status] || colorMap.unknown

  return (
    <span
      style={{
        display: 'inline-block',
        padding: 'var(--flex-space-05) var(--flex-space-1)',
        fontSize: 'var(--flex-text-xs)',
        fontWeight: 'var(--flex-font-weight-bold)',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--flex-radius-md)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
  )
}

function RelativeTime({ isoDate }: { isoDate: string }) {
  const date = new Date(isoDate)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  let relative = ''
  if (days > 0) {
    relative = `${days}d ago`
  } else if (hours > 0) {
    relative = `${hours}h ago`
  } else if (minutes > 0) {
    relative = `${minutes}m ago`
  } else {
    relative = 'just now'
  }

  return <span title={date.toLocaleString()}>{relative}</span>
}

export function DeploymentCard({ deployment }: DeploymentCardProps) {
  const { branch, url, commit, service, health, pullRequest } = deployment

  return (
    <div
      class="content-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--flex-space-2)',
      }}
    >
      {/* Header: Branch name + status badges */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--flex-space-2)',
        }}
      >
        <h3
          style={{
            fontSize: 'var(--flex-text-lg)',
            fontWeight: 'var(--flex-font-weight-bold)',
            margin: 0,
            wordBreak: 'break-word',
          }}
        >
          <a
            href={url}
            style={{
              color: 'var(--flex-color-primary)',
              textDecoration: 'none',
            }}
          >
            {branch}
          </a>
        </h3>
        <div
          style={{
            display: 'flex',
            gap: 'var(--flex-space-1)',
            flexShrink: 0,
          }}
        >
          <StatusBadge status={service.status} label={service.status} />
          <StatusBadge status={health.status} label={health.status} />
        </div>
      </div>

      {/* Pull Request info */}
      {pullRequest && (
        <div
          style={{
            fontSize: 'var(--flex-text-sm)',
            padding: 'var(--flex-space-1) var(--flex-space-2)',
            backgroundColor: 'var(--flex-color-info-lightest)',
            borderRadius: 'var(--flex-radius-md)',
            borderLeft: '3px solid var(--flex-color-info)',
          }}
        >
          <a
            href={pullRequest.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--flex-color-primary)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--flex-space-1)',
            }}
          >
            <span style={{ fontWeight: 'var(--flex-font-weight-semibold)' }}>
              #{pullRequest.number}
            </span>
            <span>{pullRequest.title}</span>
            <StatusBadge
              status={pullRequest.status}
              label={pullRequest.status}
            />
          </a>
        </div>
      )}

      {/* Commit info */}
      <div
        style={{
          padding: 'var(--flex-space-2)',
          backgroundColor: 'var(--flex-color-base-lightest)',
          borderRadius: 'var(--flex-radius-md)',
          borderLeft: '3px solid var(--flex-color-primary)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--flex-text-sm)',
            fontFamily: 'var(--flex-font-mono)',
            marginBottom: 'var(--flex-space-1)',
          }}
        >
          <a
            href={commit.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--flex-color-primary)',
              textDecoration: 'none',
            }}
          >
            {commit.shortSha}
          </a>
        </div>
        <div
          style={{
            fontSize: 'var(--flex-text-sm)',
            marginBottom: 'var(--flex-space-1)',
          }}
        >
          {commit.message}
        </div>
        <div
          style={{
            fontSize: 'var(--flex-text-xs)',
            color: 'var(--flex-color-text-muted)',
          }}
        >
          {commit.author} · <RelativeTime isoDate={commit.date} />
        </div>
      </div>

      {/* Metadata row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--flex-text-xs)',
          color: 'var(--flex-color-text-muted)',
          paddingTop: 'var(--flex-space-1)',
          borderTop: '1px solid var(--flex-color-base-lighter)',
        }}
      >
        <div>
          {service.uptime && (
            <span title="Service uptime">⏱️ {service.uptime}</span>
          )}
        </div>
        <div>
          {health.responseTime && (
            <span title="Health check response time">
              🏥 {health.responseTime}ms
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
