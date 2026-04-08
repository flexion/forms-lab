import type { Child, FC } from 'hono/jsx'

interface SideNavProps {
  label?: string
  children: Child
}

export const SideNav: FC<SideNavProps> = ({
  label = 'Side navigation',
  children,
}) => {
  return (
    <nav aria-label={label}>
      <ul class="flex-sidenav">{children}</ul>
    </nav>
  )
}

interface SideNavItemProps {
  href: string
  current?: boolean
  children: Child
}

export const SideNavItem: FC<SideNavItemProps> = ({
  href,
  current,
  children,
}) => {
  return (
    <li class="flex-sidenav__item">
      <a
        href={href}
        class={`flex-sidenav__link${current ? ' flex-sidenav__link--current' : ''}`}
        {...(current ? { 'aria-current': 'page' } : {})}
      >
        {typeof children === 'string' ? children : children}
      </a>
    </li>
  )
}

interface SideNavNestedProps {
  href: string
  label: string
  current?: boolean
  children: Child
}

export const SideNavNested: FC<SideNavNestedProps> = ({
  href,
  label,
  current,
  children,
}) => {
  return (
    <li class="flex-sidenav__item">
      <a
        href={href}
        class={`flex-sidenav__link${current ? ' flex-sidenav__link--current' : ''}`}
        {...(current ? { 'aria-current': 'page' } : {})}
      >
        {label}
      </a>
      <ul class="flex-sidenav__sublist">{children}</ul>
    </li>
  )
}

interface SideNavSubItemProps {
  href: string
  current?: boolean
  children: Child
}

export const SideNavSubItem: FC<SideNavSubItemProps> = ({
  href,
  current,
  children,
}) => {
  return (
    <li class="flex-sidenav__item">
      <a
        href={href}
        class={`flex-sidenav__link${current ? ' flex-sidenav__link--current' : ''}`}
        {...(current ? { 'aria-current': 'page' } : {})}
      >
        {children}
      </a>
    </li>
  )
}
