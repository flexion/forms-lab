import type { FC } from 'hono/jsx'
import { ValidationMessage, ValidationSummary } from './index'

export const Default: FC = () => (
  <ValidationMessage state="error">This field is required.</ValidationMessage>
)

export const Success: FC = () => (
  <ValidationMessage state="success">Your input looks good.</ValidationMessage>
)

export const ErrorMessage: FC = () => (
  <ValidationMessage id="name-error" state="error">
    Enter a valid name.
  </ValidationMessage>
)

export const Summary: FC = () => (
  <ValidationSummary
    errors={[
      { id: 'first-name', message: 'Enter your first name' },
      { id: 'email', message: 'Enter a valid email address' },
    ]}
  />
)

export const SummaryCustomHeading: FC = () => (
  <ValidationSummary
    heading="Please fix the following errors"
    errors={[{ id: 'phone', message: 'Enter a valid phone number' }]}
  />
)
