import type { Child, FC } from 'hono/jsx'

interface ValidationMessageProps {
  id?: string
  state: 'error' | 'success'
  children: Child
}

export const ValidationMessage: FC<ValidationMessageProps> = ({
  id,
  state,
  children,
}) => {
  return (
    <div class="flex-validation" id={id} data-state={state}>
      <span class="flex-validation__message">{children}</span>
    </div>
  )
}

interface ValidationSummaryError {
  id: string
  message: string
}

interface ValidationSummaryProps {
  heading?: string
  errors: ValidationSummaryError[]
}

export const ValidationSummary: FC<ValidationSummaryProps> = ({
  heading = 'Your form has errors',
  errors,
}) => {
  return (
    <div class="flex-validation-summary" role="alert">
      <h3 class="flex-validation-summary__heading">{heading}</h3>
      <ul class="flex-validation-summary__list">
        {errors.map((error) => (
          <li key={error.id}>
            <a href={`#${error.id}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
