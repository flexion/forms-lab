import type { FC } from 'hono/jsx'
import { Label } from './index'

export const Default: FC = () => <Label htmlFor="input-1">First name</Label>

export const Required: FC = () => (
  <Label htmlFor="input-2" required>
    Email address
  </Label>
)
