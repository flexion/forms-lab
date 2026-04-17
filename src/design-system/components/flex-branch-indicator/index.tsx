import type { FC } from 'hono/jsx'

interface BranchIndicatorProps {
  name: string
  isPublished?: boolean
  ahead?: number
}

export const BranchIndicator: FC<BranchIndicatorProps> = ({
  name,
  isPublished,
  ahead,
}) => {
  return (
    <span
      class="flex-branch-indicator"
      data-published={isPublished ? 'true' : 'false'}
    >
      <svg
        aria-hidden="true"
        class="flex-branch-indicator__icon"
        width="14"
        height="14"
        viewBox="0 0 16 16"
      >
        <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.5 2.5 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
      </svg>
      <span class="flex-branch-indicator__name">{name}</span>
      {isPublished ? (
        <span class="flex-branch-indicator__badge">published</span>
      ) : null}
      {!isPublished && ahead != null ? (
        <span class="flex-branch-indicator__meta">{ahead} ahead</span>
      ) : null}
    </span>
  )
}
