import type { FC } from 'hono/jsx'
import { Label } from '../flex-label/index'
import { Textarea } from './index'

export const Default: FC = () => (
  <div>
    <Label htmlFor="textarea-default">Comments</Label>
    <Textarea id="textarea-default" name="comments" />
  </div>
)

export const WithError: FC = () => (
  <div>
    <Label htmlFor="textarea-error">Description</Label>
    <Textarea
      id="textarea-error"
      name="description"
      state="error"
      ariaDescribedby="textarea-error-msg"
    />
  </div>
)
