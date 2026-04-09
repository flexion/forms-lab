import type { Child, FC } from 'hono/jsx'

/* ---------- USWDS Card ---------- */

type CardVariant = 'flag' | 'header-first'

interface CardProps {
  variant?: CardVariant
  mediaRight?: boolean
  children: Child
}

export const Card: FC<CardProps> = ({ variant, mediaRight, children }) => {
  return (
    <div
      class="flex-card"
      data-variant={variant}
      data-media-right={mediaRight || undefined}
    >
      <div class="flex-card__container">{children}</div>
    </div>
  )
}

interface CardHeaderProps {
  children: Child
}

export const CardHeader: FC<CardHeaderProps> = ({ children }) => {
  return <div class="flex-card__header">{children}</div>
}

interface CardHeadingProps {
  children: Child
}

export const CardHeading: FC<CardHeadingProps> = ({ children }) => {
  return <h2 class="flex-card__heading">{children}</h2>
}

interface CardMediaProps {
  src: string
  alt: string
  inset?: boolean
}

export const CardMedia: FC<CardMediaProps> = ({ src, alt, inset }) => {
  return (
    <div class="flex-card__media" data-inset-media={inset || undefined}>
      <div class="flex-card__img">
        <img src={src} alt={alt} />
      </div>
    </div>
  )
}

interface CardBodyProps {
  children: Child
}

export const CardBody: FC<CardBodyProps> = ({ children }) => {
  return <div class="flex-card__body">{children}</div>
}

interface CardFooterProps {
  children: Child
}

export const CardFooter: FC<CardFooterProps> = ({ children }) => {
  return <div class="flex-card__footer">{children}</div>
}

/* ---------- Legacy ContentCard (convenience wrapper) ---------- */

interface ContentCardProps {
  title: string
  href: string
  description?: string
  children?: Child
}

export const ContentCard: FC<ContentCardProps> = ({
  title,
  href,
  description,
  children,
}) => {
  return (
    <div class="content-card">
      <h2>
        <a href={href}>{title}</a>
      </h2>
      {description && <p>{description}</p>}
      {children && <div class="card-meta">{children}</div>}
    </div>
  )
}
