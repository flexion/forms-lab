import type { FC } from 'hono/jsx'
import { DatePicker } from './index'

export const DefaultDatePicker: FC = () => (
  <DatePicker id="date" name="date" label="Date" />
)

export const DatePickerWithConstraints: FC = () => (
  <DatePicker
    id="appointment"
    name="appointment"
    label="Appointment date"
    minDate="2020-01-01"
    maxDate="2030-12-31"
  />
)

export const DatePickerWithDefault: FC = () => (
  <DatePicker
    id="birthday"
    name="birthday"
    label="Date of birth"
    defaultValue="1990-06-15"
  />
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default</h3>
      <DefaultDatePicker />
    </div>
    <div>
      <h3>With date constraints</h3>
      <DatePickerWithConstraints />
    </div>
    <div>
      <h3>With default value</h3>
      <DatePickerWithDefault />
    </div>
  </div>
)
