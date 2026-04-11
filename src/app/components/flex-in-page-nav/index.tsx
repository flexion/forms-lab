import type { FC } from 'hono/jsx'

interface InPageNavProps {
  headingLevels?: string
  heading?: string
}

export const InPageNav: FC<InPageNavProps> = ({
  headingLevels,
  heading = 'On this page',
}) => (
  <flex-in-page-nav data-heading-levels={headingLevels}>
    <nav class="flex-in-page-nav__nav" aria-label={heading}>
      <h4 class="flex-in-page-nav__heading">{heading}</h4>
      <ul class="flex-in-page-nav__list">
        {/* Populated by client.ts from page headings */}
      </ul>
    </nav>
  </flex-in-page-nav>
)
