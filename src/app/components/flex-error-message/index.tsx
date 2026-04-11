import type { Child, FC } from 'hono/jsx'

interface ErrorMessageProps {
  id?: string
  children: Child
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ id, children }) => {
  return (
    <span class="flex-error-message" id={id} role="alert">
      {children}
    </span>
  )
}
