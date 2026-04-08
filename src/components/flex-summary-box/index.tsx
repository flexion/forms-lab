import type { Child, FC } from 'hono/jsx'

interface SummaryBoxProps {
  heading: string
  headingId?: string
  children: Child
}

export const SummaryBox: FC<SummaryBoxProps> = ({
  heading,
  headingId,
  children,
}) => {
  const id = headingId || 'summary-heading'
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="region" matches USWDS pattern for summary-box
    <div class="flex-summary-box" role="region" aria-labelledby={id}>
      <div class="flex-summary-box__body">
        <h3 class="flex-summary-box__heading" id={id}>
          {heading}
        </h3>
        <div class="flex-summary-box__text">{children}</div>
      </div>
    </div>
  )
}
