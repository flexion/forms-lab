import type { FC } from 'hono/jsx'
import { Alert } from '../flex-alert'
import { Form } from '../flex-form'

interface FormSubmissionSummary {
  id: string
  submittedAt: string
}

interface FormConfirmationProps {
  submission: FormSubmissionSummary
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export const FormConfirmation: FC<FormConfirmationProps> = ({ submission }) => {
  return (
    <Form size="large">
      <Alert variant="success" heading="Your form has been submitted">
        Your reference number is <strong>{submission.id}</strong>
      </Alert>
      <h2>What happens next</h2>
      <p>
        We have received your submission. You do not need to do anything else at
        this time.
      </p>
      <dl class="flex-summary-list">
        <div class="flex-summary-list__row">
          <dt class="flex-summary-list__key">Submitted</dt>
          <dd class="flex-summary-list__value">
            {formatDate(submission.submittedAt)}
          </dd>
        </div>
      </dl>
      <p>
        <a href="/">Return to home</a>
      </p>
    </Form>
  )
}
