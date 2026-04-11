import type { FC } from 'hono/jsx'
import { evaluateCondition } from '../../../services/forms/resolver'
import type { FieldEntry, ResolvedForm } from '../../../types/models'
import { Form } from '../flex-form'

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
    <Form size="large">
      <h1>Review your answers</h1>
      <p>Check your answers before submitting.</p>
      {resolved.pages.map((resolvedPage, pageIndex) => {
        if (!evaluateCondition(resolvedPage.page.condition, fields)) return null
        return (
          <section key={resolvedPage.page.id}>
            <div class="l-cluster" style="justify-content: space-between">
              <h2>{resolvedPage.page.title}</h2>
              <a href={`${editBaseUrl}/${pageIndex}`}>
                Change
                <span class="u-visually-hidden">
                  {' '}
                  {resolvedPage.page.title}
                </span>
              </a>
            </div>
            {resolvedPage.groups.map((group) => {
              if (!evaluateCondition(group.condition, fields)) return null
              return (
                <dl key={group.id} class="flex-summary-list">
                  {group.requirements.map((req) => {
                    if (!evaluateCondition(req.condition, fields)) return null
                    const entry = fields[req.fieldName]
                    const displayValue = formatValue(entry?.value)
                    return (
                      <div key={req.id} class="flex-summary-list__row">
                        <dt class="flex-summary-list__key">{req.label}</dt>
                        <dd class="flex-summary-list__value">
                          {displayValue === 'Not provided' ? (
                            <span class="u-text-muted">{displayValue}</span>
                          ) : (
                            displayValue
                          )}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
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
    </Form>
  )
}

function formatValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return 'Not provided'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
