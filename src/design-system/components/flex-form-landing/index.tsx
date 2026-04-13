import type { FC } from 'hono/jsx'
import { Form } from '../flex-form'

interface FormLandingSpec {
  title: string
  description?: string
  pages: { length: number }
}

interface FormLandingProps {
  formSpec: FormLandingSpec
  startUrl: string
}

export const FormLanding: FC<FormLandingProps> = ({ formSpec, startUrl }) => {
  return (
    <Form size="large">
      <h1>{formSpec.title}</h1>
      {formSpec.description && <p class="flex-prose">{formSpec.description}</p>}
      <p>This form has {formSpec.pages.length} sections.</p>
      <form method="post" action={startUrl}>
        <button type="submit" class="flex-button">
          Start now
        </button>
      </form>
    </Form>
  )
}
