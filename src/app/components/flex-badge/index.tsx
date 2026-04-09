import type { FC } from 'hono/jsx'

interface StatusBadgeProps {
  status: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span class="badge" data-status={status}>
      {status}
    </span>
  )
}
