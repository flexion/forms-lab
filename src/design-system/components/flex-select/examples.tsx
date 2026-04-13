import type { FC } from 'hono/jsx'
import { ErrorMessage } from '../flex-error-message/index'
import { Label } from '../flex-label/index'
import { Select } from './index'

const sampleOptions = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
]

export const Default: FC = () => (
  <div>
    <Label htmlFor="sel-default">Choose an option</Label>
    <Select id="sel-default" name="choice" options={sampleOptions} />
  </div>
)

export const Disabled: FC = () => (
  <div>
    <Label htmlFor="sel-disabled">Disabled select</Label>
    <Select
      id="sel-disabled"
      name="disabled"
      options={sampleOptions}
      disabled
    />
  </div>
)

export const WithError: FC = () => (
  <div>
    <Label htmlFor="sel-error">Required field</Label>
    <Select id="sel-error" name="error" options={sampleOptions} state="error" />
    <ErrorMessage id="sel-error-msg">Please select an option.</ErrorMessage>
  </div>
)

export const Multiple: FC = () => (
  <div>
    <Label htmlFor="sel-multi">Select multiple</Label>
    <Select id="sel-multi" name="multi" options={sampleOptions} multiple />
  </div>
)
