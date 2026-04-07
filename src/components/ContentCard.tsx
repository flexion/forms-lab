import type { FC } from 'hono/jsx'

interface ContentCardProps {
  title: string
  href: string
  description?: string
  children?: any
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
