import type { Child, FC } from 'hono/jsx'

interface ErrorMessageProps {
  id?: string
  children: Child
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ id, children }) => {
  return (
    <span class="flex-error-message" id={id} role="alert">
      <span class="u-visually-hidden">Error: </span>
      {children}
    </span>
  )
}
