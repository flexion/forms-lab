import type { Child, FC } from 'hono/jsx'

interface TagProps {
  size?: 'big'
  children: Child
}

export const Tag: FC<TagProps> = ({ size, children }) => {
  return (
    <span class="flex-tag" data-size={size}>
      {children}
    </span>
  )
}
