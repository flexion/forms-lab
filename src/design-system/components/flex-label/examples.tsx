import type { FC } from 'hono/jsx'
import { Label } from './index'

export const Default: FC = () => <Label htmlFor="input-1">First name</Label>

export const Optional: FC = () => (
  <Label htmlFor="input-2" optional>
    Phone number
  </Label>
)
