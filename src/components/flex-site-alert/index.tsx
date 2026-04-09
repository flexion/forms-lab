import type { Child, FC } from 'hono/jsx'

type SiteAlertVariant = 'info' | 'emergency'

interface SiteAlertProps {
  variant?: SiteAlertVariant
  heading?: string
  slim?: boolean
  noIcon?: boolean
  noHeading?: boolean
  children: Child
}

export const SiteAlert: FC<SiteAlertProps> = ({
  variant = 'info',
  heading,
  slim,
  noIcon,
  noHeading,
  children,
}) => {
  return (
    <section
      class="flex-site-alert"
      data-variant={variant}
      data-slim={slim || undefined}
      data-no-icon={noIcon || undefined}
      data-no-heading={noHeading || undefined}
      aria-label="Site alert"
    >
      <div class="flex-site-alert__body">
        {heading && !noHeading && (
          <h3 class="flex-site-alert__heading">{heading}</h3>
        )}
        <p class="flex-site-alert__text">{children}</p>
      </div>
    </section>
  )
}
