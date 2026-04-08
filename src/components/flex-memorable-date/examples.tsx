import type { FC } from 'hono/jsx'
import { MemorableDate } from './index'

export const DefaultMemorableDate: FC = () => (
  <MemorableDate id="dob" legend="Date of birth" />
)

export const RequiredMemorableDate: FC = () => (
  <MemorableDate id="start-date" legend="Start date" required />
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default</h3>
      <DefaultMemorableDate />
    </div>
    <div>
      <h3>Required</h3>
      <RequiredMemorableDate />
    </div>
  </div>
)
