import type { FC } from 'hono/jsx'
import { evaluateCondition } from '../../services/form-resolver'
import type { FieldEntry, ResolvedForm } from '../../types/models'

interface FormReviewProps {
  resolved: ResolvedForm
  fields: Record<string, FieldEntry>
  submitUrl: string
  editBaseUrl: string
}

export const FormReview: FC<FormReviewProps> = ({
  resolved,
  fields,
  submitUrl,
  editBaseUrl,
}) => {
  return (
    <div class="l-stack">
      <h1>Review Your Answers</h1>
      <p>Please review your answers before submitting.</p>
      {resolved.pages.map((resolvedPage, pageIndex) => {
        if (!evaluateCondition(resolvedPage.page.condition, fields)) return null
        return (
          <section key={resolvedPage.page.id} class="l-stack">
            <div class="l-cluster" style="justify-content: space-between">
              <h2>{resolvedPage.page.title}</h2>
              <a href={`${editBaseUrl}/${pageIndex}`}>Edit</a>
            </div>
            {resolvedPage.groups.map((group) => {
              if (!evaluateCondition(group.condition, fields)) return null
              return (
                <div key={group.id} class="l-stack">
                  <h3>{group.title}</h3>
                  <dl>
                    {group.requirements.map((req) => {
                      if (!evaluateCondition(req.condition, fields)) return null
                      const entry = fields[req.fieldName]
                      const displayValue = formatValue(entry?.value)
                      return (
                        <div key={req.id}>
                          <dt>{req.label}</dt>
                          <dd>{displayValue}</dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              )
            })}
          </section>
        )
      })}
      <form method="post" action={submitUrl}>
        <button type="submit" class="flex-button">
          Submit
        </button>
      </form>
    </div>
  )
}

function formatValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
