import type { Child, FC } from 'hono/jsx'

interface FormProps {
  action?: string
  method?: 'get' | 'post' | 'dialog'
  size?: 'large'
  children: Child
}

export const Form: FC<FormProps> = ({ action, method, size, children }) => {
  return (
    <form class="flex-form" action={action} method={method} data-size={size}>
      {children}
    </form>
  )
}
