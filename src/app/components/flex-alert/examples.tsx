import type { FC } from 'hono/jsx'
import { Alert } from './index'

/**
 * Examples use the same text as the USWDS alert documentation:
 * https://designsystem.digital.gov/components/alert/
 *
 * The body text includes a hyperlink to verify link color rendering
 * against both light and dark (emergency) alert backgrounds.
 */

const alertBody = (
  <>
    Lorem ipsum dolor sit amet, <a href="/example">consectetur adipiscing</a>{' '}
    elit, sed do eiusmod.
  </>
)

export const InfoAlert: FC = () => (
  <Alert variant="info" heading="Informative status">
    {alertBody}
  </Alert>
)

export const WarningAlert: FC = () => (
  <Alert variant="warning" heading="Warning status">
    {alertBody}
  </Alert>
)

export const SuccessAlert: FC = () => (
  <Alert variant="success" heading="Success status">
    {alertBody}
  </Alert>
)

export const ErrorAlert: FC = () => (
  <Alert variant="error" heading="Error status">
    {alertBody}
  </Alert>
)

export const EmergencyAlert: FC = () => (
  <Alert variant="emergency" heading="Emergency status">
    {alertBody}
  </Alert>
)

export const SlimAlert: FC = () => (
  <Alert variant="info" slim>
    {alertBody}
  </Alert>
)

export const NoIconAlert: FC = () => (
  <Alert variant="info" noIcon heading="Informative status">
    {alertBody}
  </Alert>
)
