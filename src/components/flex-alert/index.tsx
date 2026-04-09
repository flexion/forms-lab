import type { Child, FC } from 'hono/jsx'

type AlertVariant = 'info' | 'warning' | 'success' | 'error' | 'emergency'

interface AlertProps {
  variant?: AlertVariant
  heading?: string
  slim?: boolean
  noIcon?: boolean
  children: Child
}

export const Alert: FC<AlertProps> = ({
  variant = 'info',
  heading,
  slim,
  noIcon,
  children,
}) => {
  return (
    <div
      class="flex-alert"
      data-variant={variant}
      data-slim={slim || undefined}
      data-no-icon={noIcon || undefined}
      role="alert"
    >
      {heading && <h4 class="flex-alert__heading">{heading}</h4>}
      <p class="flex-alert__text">{children}</p>
    </div>
  )
}
