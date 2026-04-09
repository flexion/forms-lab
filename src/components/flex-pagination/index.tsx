import type { FC } from 'hono/jsx'
import { Icon } from '../flex-icon/index'

interface PaginationProps {
  totalPages: number
  currentPage: number
  baseHref: string
}

/**
 * Compute the page numbers to show, with overflow ellipsis.
 * For 7 or fewer pages, show all. Otherwise show a window around
 * the current page with first/last and ellipsis.
 */
function getPageSlots(
  totalPages: number,
  currentPage: number,
): (number | 'overflow')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const slots: (number | 'overflow')[] = []

  // Always show first page
  slots.push(1)

  if (currentPage > 3) {
    slots.push('overflow')
  }

  // Pages around current
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let i = start; i <= end; i++) {
    slots.push(i)
  }

  if (currentPage < totalPages - 2) {
    slots.push('overflow')
  }

  // Always show last page
  slots.push(totalPages)

  return slots
}

function pageHref(baseHref: string, page: number): string {
  const separator = baseHref.includes('?') ? '&' : '?'
  return `${baseHref}${separator}page=${page}`
}

export const Pagination: FC<PaginationProps> = ({
  totalPages,
  currentPage,
  baseHref,
}) => {
  const slots = getPageSlots(totalPages, currentPage)
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <nav class="flex-pagination" aria-label="Pagination">
      <ul class="flex-pagination__list">
        {hasPrevious ? (
          <li class="flex-pagination__item flex-pagination__item--previous">
            <a
              href={pageHref(baseHref, currentPage - 1)}
              class="flex-pagination__link"
              aria-label="Previous page"
            >
              <Icon name="navigate_before" />
              <span class="flex-pagination__link-text">Previous</span>
            </a>
          </li>
        ) : null}
        {slots.map((slot) => {
          if (slot === 'overflow') {
            return (
              <li class="flex-pagination__item">
                <span class="flex-pagination__overflow" aria-hidden="true">
                  ...
                </span>
              </li>
            )
          }
          const isCurrent = slot === currentPage
          return (
            <li
              class={`flex-pagination__item${isCurrent ? ' flex-pagination__item--current' : ''}`}
            >
              <a
                href={pageHref(baseHref, slot)}
                class={`flex-pagination__button${isCurrent ? ' flex-pagination__button--current' : ''}`}
                aria-label={
                  isCurrent ? `Page ${slot}, current page` : `Page ${slot}`
                }
                {...(isCurrent ? { 'aria-current': 'page' } : {})}
              >
                {slot}
              </a>
            </li>
          )
        })}
        {hasNext ? (
          <li class="flex-pagination__item flex-pagination__item--next">
            <a
              href={pageHref(baseHref, currentPage + 1)}
              class="flex-pagination__link"
              aria-label="Next page"
            >
              <span class="flex-pagination__link-text">Next</span>
              <Icon name="navigate_next" />
            </a>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
