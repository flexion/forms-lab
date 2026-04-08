import type { FC } from 'hono/jsx'
import { Alert } from './index'

export const InfoAlert: FC = () => (
  <Alert variant="info" heading="Informational status">
    This is an informational alert.
  </Alert>
)

export const WarningAlert: FC = () => (
  <Alert variant="warning" heading="Warning status">
    This is a warning alert.
  </Alert>
)

export const SuccessAlert: FC = () => (
  <Alert variant="success" heading="Success status">
    This is a success alert.
  </Alert>
)

export const ErrorAlert: FC = () => (
  <Alert variant="error" heading="Error status">
    This is an error alert.
  </Alert>
)

export const EmergencyAlert: FC = () => (
  <Alert variant="emergency" heading="Emergency status">
    This is an emergency alert.
  </Alert>
)

export const SlimAlert: FC = () => (
  <Alert variant="info" slim>
    This is a slim alert without a heading.
  </Alert>
)

export const NoIconAlert: FC = () => (
  <Alert variant="info" noIcon heading="No icon">
    This alert has no icon.
  </Alert>
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <h3>Variants</h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <InfoAlert />
        <WarningAlert />
        <SuccessAlert />
        <ErrorAlert />
        <EmergencyAlert />
      </div>
    </div>
    <div>
      <h3>Modifiers</h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <SlimAlert />
        <NoIconAlert />
      </div>
    </div>
  </div>
)
