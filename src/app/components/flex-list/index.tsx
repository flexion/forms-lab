import type { Child, FC } from 'hono/jsx'

interface ListProps {
  variant?: 'unstyled'
  ordered?: boolean
  children: Child
}

export const List: FC<ListProps> = ({ variant, ordered, children }) => {
  if (ordered) {
    return (
      <ol class="flex-list" data-variant={variant}>
        {children}
      </ol>
    )
  }

  return (
    <ul class="flex-list" data-variant={variant}>
      {children}
    </ul>
  )
}
