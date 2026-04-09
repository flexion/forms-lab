import type { FC } from 'hono/jsx'
import { ErrorMessage } from '../flex-error-message/index'
import { Label } from '../flex-label/index'
import { TextInput } from './index'

export const Default: FC = () => (
  <div>
    <Label htmlFor="input-default">Name</Label>
    <TextInput id="input-default" name="name" />
  </div>
)

export const WithError: FC = () => (
  <div>
    <Label htmlFor="input-error">Email</Label>
    <TextInput
      id="input-error"
      name="email"
      type="email"
      state="error"
      ariaDescribedby="error-msg"
    />
    <ErrorMessage id="error-msg">
      Please enter a valid email address.
    </ErrorMessage>
  </div>
)

export const WidthVariants: FC = () => (
  <div>
    <Label htmlFor="input-2xs">2xs (5ex)</Label>
    <TextInput id="input-2xs" width="2xs" />
    <Label htmlFor="input-xs">xs (9ex)</Label>
    <TextInput id="input-xs" width="xs" />
    <Label htmlFor="input-sm">sm (13ex)</Label>
    <TextInput id="input-sm" width="sm" />
    <Label htmlFor="input-md">md (20ex)</Label>
    <TextInput id="input-md" width="md" />
    <Label htmlFor="input-lg">lg (30ex)</Label>
    <TextInput id="input-lg" width="lg" />
    <Label htmlFor="input-xl">xl (40ex)</Label>
    <TextInput id="input-xl" width="xl" />
    <Label htmlFor="input-2xl">2xl (50ex)</Label>
    <TextInput id="input-2xl" width="2xl" />
  </div>
)

export const Disabled: FC = () => (
  <div>
    <Label htmlFor="input-disabled">Disabled field</Label>
    <TextInput id="input-disabled" disabled value="Cannot edit" />
  </div>
)
