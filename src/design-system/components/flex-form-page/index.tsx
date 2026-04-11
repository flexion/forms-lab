import type { FC } from 'hono/jsx'
import { evaluateCondition } from '../../../services/forms/resolver'
import type { FieldEntry, ResolvedPage } from '../../../types/models'
import { Form } from '../flex-form'
import type { FormError } from '../flex-form-error-summary'
import { FormErrorSummary } from '../flex-form-error-summary'
import { FormField } from '../flex-form-field'
import { FormStepText } from '../flex-form-step-text'

interface FormPageViewProps {
  resolvedPage: ResolvedPage
  actionUrl: string
  currentPage: number
  totalPages: number
  fields: Record<string, FieldEntry>
  errors: FormError[]
  prevUrl: string | null
}

export const FormPageView: FC<FormPageViewProps> = ({
  resolvedPage,
  actionUrl,
  currentPage,
  totalPages,
  fields,
  errors,
  prevUrl,
}) => {
  const { page, groups } = resolvedPage

  return (
    <Form size="large">
      <FormStepText current={currentPage} total={totalPages} />
      <h1>{page.title}</h1>
      {page.description && <p>{page.description}</p>}
      <FormErrorSummary errors={errors} />
      <form method="post" action={actionUrl} novalidate>
        {groups.map((group) => {
          if (!evaluateCondition(group.condition, fields)) return null
          return (
            <fieldset key={group.id}>
              <legend>{group.title}</legend>
              {group.description && <p>{group.description}</p>}
              {group.requirements.map((req) => {
                if (!evaluateCondition(req.condition, fields)) return null
                return (
                  <FormField
                    key={req.id}
                    requirement={req}
                    entry={fields[req.fieldName]}
                  />
                )
              })}
            </fieldset>
          )
        })}
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
