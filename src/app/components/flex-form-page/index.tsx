import type { FC } from 'hono/jsx'
import { evaluateCondition } from '../../../services/form-resolver'
import type { FieldEntry, ResolvedPage } from '../../../types/models'
import { FormField } from '../flex-form-field'

interface FormPageViewProps {
  resolvedPage: ResolvedPage
  actionUrl: string
  fields: Record<string, FieldEntry>
  prevUrl: string | null
}

export const FormPageView: FC<FormPageViewProps> = ({
  resolvedPage,
  actionUrl,
  fields,
  prevUrl,
}) => {
  const { page, groups } = resolvedPage

  return (
    <div class="l-stack">
      <h1>{page.title}</h1>
      {page.description && <p>{page.description}</p>}
      <form method="post" action={actionUrl}>
        {groups.map((group) => {
          if (!evaluateCondition(group.condition, fields)) return null
          return (
            <fieldset key={group.id} class="l-stack">
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
          {prevUrl && <a href={prevUrl}>Previous</a>}
          <button type="submit" class="flex-button">
            Continue
          </button>
        </div>
      </form>
    </div>
  )
}
