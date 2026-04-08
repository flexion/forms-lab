import type { Child, FC } from 'hono/jsx'

interface FooterProps {
  variant?: 'slim' | 'medium' | 'big'
  children: Child
}

export const Footer: FC<FooterProps> = ({ variant, children }) => {
  return (
    <footer class="flex-footer" data-variant={variant}>
      {children}
    </footer>
  )
}

interface ReturnToTopProps {
  href?: string
}

export const FooterReturnToTop: FC<ReturnToTopProps> = ({ href = '#' }) => {
  return (
    <div class="flex-footer__return-to-top">
      <a href={href}>Return to top</a>
    </div>
  )
}

interface FooterPrimaryProps {
  children: Child
}

export const FooterPrimary: FC<FooterPrimaryProps> = ({ children }) => {
  return (
    <div class="flex-footer__primary">
      <div class="flex-footer__primary-container">{children}</div>
    </div>
  )
}

interface FooterSecondaryProps {
  children: Child
}

export const FooterSecondary: FC<FooterSecondaryProps> = ({ children }) => {
  return (
    <div class="flex-footer__secondary">
      <div class="flex-footer__secondary-container">{children}</div>
    </div>
  )
}

interface FooterLogoProps {
  src: string
  alt: string
  heading?: string
}

export const FooterLogo: FC<FooterLogoProps> = ({ src, alt, heading }) => {
  return (
    <div class="flex-footer__logo">
      <img class="flex-footer__logo-img" src={src} alt={alt} />
      {heading && <p class="flex-footer__logo-heading">{heading}</p>}
    </div>
  )
}

interface FooterContactInfoProps {
  children: Child
}

export const FooterContactInfo: FC<FooterContactInfoProps> = ({ children }) => {
  return <div class="flex-footer__contact-info">{children}</div>
}

interface FooterNavProps {
  children: Child
}

export const FooterNav: FC<FooterNavProps> = ({ children }) => {
  return <nav class="flex-footer__nav">{children}</nav>
}
