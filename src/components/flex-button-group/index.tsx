import type { Child, FC } from 'hono/jsx'

interface ButtonGroupProps {
  variant?: 'segmented'
  children: Child
}

export const ButtonGroup: FC<ButtonGroupProps> = ({ variant, children }) => {
  return (
    <ul class="flex-button-group" data-variant={variant}>
      {children}
    </ul>
  )
}

interface ButtonGroupItemProps {
  children: Child
}

export const ButtonGroupItem: FC<ButtonGroupItemProps> = ({ children }) => {
  return <li class="flex-button-group__item">{children}</li>
}
