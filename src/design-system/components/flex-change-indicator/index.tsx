import type { FC } from 'hono/jsx'

type Variant = 'modified' | 'added' | 'removed'

interface ChangeIndicatorProps {
  variant: Variant
  label?: string
}

const LABELS: Record<Variant, string> = {
  modified: 'Modified',
  added: 'New',
  removed: 'Removed',
}

export const ChangeIndicator: FC<ChangeIndicatorProps> = ({
  variant,
  label,
}) => {
  return (
    <span
      class="flex-change-indicator"
      data-variant={variant}
      role="status"
      aria-label={label ?? LABELS[variant]}
    >
      <span class="flex-change-indicator__dot" aria-hidden="true" />
      {label ? <span class="flex-change-indicator__label">{label}</span> : null}
    </span>
  )
}
