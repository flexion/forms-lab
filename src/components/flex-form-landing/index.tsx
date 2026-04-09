import type { FC } from 'hono/jsx'
import type { FormSpec } from '../../types/models'

interface FormLandingProps {
  formSpec: FormSpec
  startUrl: string
}

export const FormLanding: FC<FormLandingProps> = ({ formSpec, startUrl }) => {
  return (
    <div class="l-stack">
      <h1>{formSpec.title}</h1>
      {formSpec.description && <p>{formSpec.description}</p>}
      <p>{formSpec.pages.length} pages</p>
      <form method="post" action={startUrl}>
        <button type="submit" class="flex-button">
          Start Form
        </button>
      </form>
    </div>
  )
}
