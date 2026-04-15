import type { FC } from 'hono/jsx'

interface WalkthroughNavProps {
  currentPage: number
  totalPages: number
  prevUrl: string | null
  nextUrl: string | null
}

export const WalkthroughNav: FC<WalkthroughNavProps> = ({
  currentPage,
  totalPages,
  prevUrl,
  nextUrl,
}) => {
  return (
    <nav class="flex-walkthrough-nav" aria-label="Walkthrough navigation">
      <span class="flex-walkthrough-nav__progress">
        {currentPage} of {totalPages}
      </span>
      <div class="flex-walkthrough-nav__controls">
        {prevUrl ? (
          <a href={prevUrl} class="flex-walkthrough-nav__link">
            ← Previous
          </a>
        ) : (
          <span class="flex-walkthrough-nav__link" data-disabled>
            ← Previous
          </span>
        )}
        {nextUrl ? (
          <a href={nextUrl} class="flex-walkthrough-nav__link">
            Next →
          </a>
        ) : (
          <span class="flex-walkthrough-nav__link" data-disabled>
            Next →
          </span>
        )}
      </div>
    </nav>
  )
}
