import type { FC } from 'hono/jsx'
import type { Submission } from '../../../types/models'

interface FormConfirmationProps {
  submission: Submission
}

export const FormConfirmation: FC<FormConfirmationProps> = ({ submission }) => {
  return (
    <div class="l-stack">
      <h1>Submission Received</h1>
      <p>Thank you. Your form has been submitted successfully.</p>
      <dl>
        <dt>Submission ID</dt>
        <dd>{submission.id}</dd>
        <dt>Submitted at</dt>
        <dd>{submission.submittedAt}</dd>
      </dl>
    </div>
  )
}
