import type { FC } from 'hono/jsx'
import { MemorableDate } from './index'

export const DefaultMemorableDate: FC = () => (
  <MemorableDate id="dob" legend="Date of birth" />
)

export const RequiredMemorableDate: FC = () => (
  <MemorableDate id="start-date" legend="Start date" required />
)
