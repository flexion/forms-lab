import type { Child, FC } from 'hono/jsx'

interface IdentifierProps {
  children: Child
}

export const Identifier: FC<IdentifierProps> = ({ children }) => {
  return <div class="flex-identifier">{children}</div>
}

interface IdentifierMastheadProps {
  logoSrc: string
  logoAlt: string
  logoHref?: string
  domain: string
  agencyName: string
  agencyHref?: string
}

export const IdentifierMasthead: FC<IdentifierMastheadProps> = ({
  logoSrc,
  logoAlt,
  logoHref = '/',
  domain,
  agencyName,
  agencyHref = '/',
}) => {
  return (
    <section
      class="flex-identifier__section flex-identifier__section--masthead"
      aria-label="Agency identifier"
    >
      <div class="flex-identifier__container">
        <div class="flex-identifier__logos">
          <a href={logoHref} class="flex-identifier__logo">
            <img
              class="flex-identifier__logo-img"
              src={logoSrc}
              alt={logoAlt}
            />
          </a>
        </div>
        <div class="flex-identifier__identity">
          <p class="flex-identifier__identity-domain">{domain}</p>
          <p class="flex-identifier__identity-disclaimer">
            An official website of the <a href={agencyHref}>{agencyName}</a>
          </p>
        </div>
      </div>
    </section>
  )
}

interface IdentifierLinksProps {
  children: Child
}

export const IdentifierLinks: FC<IdentifierLinksProps> = ({ children }) => {
  return (
    <nav class="flex-identifier__section" aria-label="Important links">
      <div class="flex-identifier__container">
        <ul class="flex-identifier__required-links-list">{children}</ul>
      </div>
    </nav>
  )
}

interface IdentifierLinkItemProps {
  href: string
  children: Child
}

export const IdentifierLinkItem: FC<IdentifierLinkItemProps> = ({
  href,
  children,
}) => {
  return (
    <li class="flex-identifier__required-links-list-item">
      <a href={href} class="flex-identifier__required-link">
        {children}
      </a>
    </li>
  )
}

export const IdentifierUsagov: FC = () => {
  return (
    <section
      class="flex-identifier__section flex-identifier__section--usagov"
      aria-label="U.S. government information and services"
    >
      <div class="flex-identifier__container">
        <p class="flex-identifier__usagov-description">
          Looking for U.S. government information and services?{' '}
          <a href="https://www.usa.gov/">Visit USA.gov</a>
        </p>
      </div>
    </section>
  )
}
