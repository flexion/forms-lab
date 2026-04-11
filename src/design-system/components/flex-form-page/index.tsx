import type { FC } from 'hono/jsx'
import { Form } from '../flex-form'
import type { FormError } from '../flex-form-error-summary'
import { FormErrorSummary } from '../flex-form-error-summary'
import type { FormFieldEntry, FormFieldRequirement } from '../flex-form-field'
import { FormField } from '../flex-form-field'
import { FormStepText } from '../flex-form-step-text'

interface FormPageGroup {
  id: string
  title: string
  description?: string
  requirements: FormFieldRequirement[]
}

interface FormPageData {
  title: string
  description?: string
  groups: FormPageGroup[]
}

interface FormPageViewProps {
  page: FormPageData
  actionUrl: string
  currentPage: number
  totalPages: number
  fields: Record<string, FormFieldEntry>
  errors: FormError[]
  prevUrl: string | null
}

export const FormPageView: FC<FormPageViewProps> = ({
  page,
  actionUrl,
  currentPage,
  totalPages,
  fields,
  errors,
  prevUrl,
}) => {
  return (
    <Form size="large">
      <FormStepText current={currentPage} total={totalPages} />
      <h1>{page.title}</h1>
      {page.description && <p>{page.description}</p>}
      <FormErrorSummary errors={errors} />
      <form method="post" action={actionUrl} novalidate>
        {page.groups.map((group) => (
          <fieldset key={group.id}>
            <legend>{group.title}</legend>
            {group.description && <p>{group.description}</p>}
            {group.requirements.map((req) => (
              <FormField
                key={req.fieldName}
                requirement={req}
                entry={fields[req.fieldName]}
              />
            ))}
          </fieldset>
        ))}
        <div class="l-cluster">
          {prevUrl && <a href={prevUrl}>Back</a>}
          <button type="submit" class="flex-button">
            Continue
          </button>
        </div>
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var s=document.querySelector('.flex-form-error-summary');if(s)s.focus()})()`,
        }}
      />
    </Form>
  )
}
