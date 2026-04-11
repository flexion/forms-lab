import type { FC } from 'hono/jsx'
import { Form } from '../flex-form'
import type { FormFieldEntry } from '../flex-form-field'

interface ReviewRequirement {
  fieldName: string
  label: string
}

interface ReviewGroup {
  id: string
  requirements: ReviewRequirement[]
}

interface ReviewPage {
  id: string
  title: string
  groups: ReviewGroup[]
}

interface FormReviewProps {
  pages: ReviewPage[]
  fields: Record<string, FormFieldEntry>
  submitUrl: string
  editBaseUrl: string
}

export const FormReview: FC<FormReviewProps> = ({
  pages,
  fields,
  submitUrl,
  editBaseUrl,
}) => {
  return (
    <Form size="large">
      <h1>Review your answers</h1>
      <p>Check your answers before submitting.</p>
      {pages.map((page, pageIndex) => (
        <section key={page.id}>
          <div class="l-cluster" style="justify-content: space-between">
            <h2>{page.title}</h2>
            <a href={`${editBaseUrl}/${pageIndex}`}>
              Change
              <span class="u-visually-hidden"> {page.title}</span>
            </a>
          </div>
          {page.groups.map((group) => (
            <dl key={group.id} class="flex-summary-list">
              {group.requirements.map((req) => {
                const entry = fields[req.fieldName]
                const displayValue = formatValue(entry?.value)
                return (
                  <div key={req.fieldName} class="flex-summary-list__row">
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
          ))}
        </section>
      ))}
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
