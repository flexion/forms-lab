import type { Child, FC } from 'hono/jsx'

export interface HeaderNavItemProps {
  href: string
  label: string
  current?: boolean
}

export const HeaderNavItem: FC<HeaderNavItemProps> = ({
  href,
  label,
  current,
}) => {
  return (
    <li class="flex-header__nav-item">
      <a
        href={href}
        class={`flex-header__nav-link${current ? ' flex-header__nav-link--current' : ''}`}
        {...(current ? { 'aria-current': 'page' } : {})}
      >
        {label}
      </a>
    </li>
  )
}

interface HeaderProps {
  logoText?: string
  logoHref?: string
  navId?: string
  navLabel?: string
  children?: Child
}

export const Header: FC<HeaderProps> = ({
  logoText = 'Forms Lab',
  logoHref = '/',
  navId = 'header-nav',
  navLabel = 'Primary navigation',
  children,
}) => {
  return (
    <flex-header class="flex-header">
      <div class="flex-header__inner">
        <div class="flex-header__logo">
          <a href={logoHref} class="flex-header__logo-link">
            <span class="flex-header__logo-text">{logoText}</span>
          </a>
        </div>
        <button
          type="button"
          class="flex-header__menu-btn"
          aria-expanded="false"
          aria-controls={navId}
        >
          Menu
        </button>
        <nav class="flex-header__nav" id={navId} aria-label={navLabel}>
          <button
            type="button"
            class="flex-header__close-btn"
            aria-controls={navId}
          >
            Close
          </button>
          <ul class="flex-header__nav-list">{children}</ul>
        </nav>
      </div>
    </flex-header>
  )
}
