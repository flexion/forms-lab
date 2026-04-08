import type { FC } from 'hono/jsx'
import { ErrorMessage } from './index'

export const Default: FC = () => (
  <ErrorMessage>This field is required.</ErrorMessage>
)

export const LongMessage: FC = () => (
  <ErrorMessage>
    Please enter a valid email address in the format name@example.com. The email you provided does not match the
    expected pattern.
  </ErrorMessage>
)
