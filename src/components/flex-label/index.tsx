import type { Child, FC } from 'hono/jsx'

interface LabelProps {
  htmlFor?: string
  required?: boolean
  children: Child
}

export const Label: FC<LabelProps> = ({ htmlFor, required, children }) => {
  return (
    <label class="flex-label" for={htmlFor}>
      {children}
      {required && (
        <abbr title="required" class="flex-label__required">
          {' '}
          *
        </abbr>
      )}
    </label>
  )
}
