import type { FC } from 'hono/jsx'

interface FormStepTextProps {
  current: number
  total: number
}

export const FormStepText: FC<FormStepTextProps> = ({ current, total }) => {
  return (
    <span class="flex-form-step-text">
      Page {current} of {total}
    </span>
  )
}
