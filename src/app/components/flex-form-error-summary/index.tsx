import type { FC } from 'hono/jsx'

export interface FormError {
  fieldId: string
  message: string
}

interface FormErrorSummaryProps {
  errors: FormError[]
}

export const FormErrorSummary: FC<FormErrorSummaryProps> = ({ errors }) => {
  if (errors.length === 0) return null

  return (
    <div class="flex-form-error-summary" role="alert" tabindex={-1}>
      <h2>There is a problem</h2>
      <ul>
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a href={`#${error.fieldId}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
