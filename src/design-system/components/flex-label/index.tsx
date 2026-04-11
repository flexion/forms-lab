import type { Child, FC } from 'hono/jsx'

interface LabelProps {
  htmlFor?: string
  required?: boolean
  optional?: boolean
  children: Child
}

export const Label: FC<LabelProps> = ({ htmlFor, optional, children }) => {
  return (
    <label class="flex-label" for={htmlFor}>
      {children}
      {optional && <span class="flex-label__optional"> (optional)</span>}
    </label>
  )
}
