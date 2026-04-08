import type { Child, FC } from 'hono/jsx'

interface LinkProps {
  href: string
  external?: boolean
  children: Child
}

export const Link: FC<LinkProps> = ({ href, external, children }) => {
  const className = external ? 'flex-link flex-link--external' : 'flex-link'
  return (
    <a class={className} href={href}>
      {children}
    </a>
  )
}
