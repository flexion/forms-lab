import type { FC } from 'hono/jsx'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  variant?: 'wrap'
}

export const Breadcrumb: FC<BreadcrumbProps> = ({ items, variant }) => {
  return (
    <nav
      class="flex-breadcrumb"
      aria-label="Breadcrumbs"
      data-variant={variant}
    >
      <ol class="flex-breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return isLast ? (
            <li class="flex-breadcrumb__list-item" aria-current="page">
              <span>{item.label}</span>
            </li>
          ) : (
            <li class="flex-breadcrumb__list-item">
              <a class="flex-breadcrumb__link" href={item.href}>
                {item.label}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
