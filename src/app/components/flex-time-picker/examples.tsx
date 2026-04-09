import type { FC } from 'hono/jsx'
import { TimePicker } from './index'

export const DefaultTimePicker: FC = () => (
  <TimePicker id="time" name="time" label="Appointment time" />
)

export const TimePickerBusinessHours: FC = () => (
  <TimePicker
    id="meeting"
    name="meeting"
    label="Meeting time"
    minTime="09:00"
    maxTime="17:00"
    step={30}
  />
)

export const TimePickerFineGrained: FC = () => (
  <TimePicker
    id="alarm"
    name="alarm"
    label="Alarm time"
    minTime="06:00"
    maxTime="10:00"
    step={15}
  />
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default (all day, 30-min steps)</h3>
      <DefaultTimePicker />
    </div>
    <div>
      <h3>Business hours (9am-5pm)</h3>
      <TimePickerBusinessHours />
    </div>
    <div>
      <h3>Fine-grained (15-min steps)</h3>
      <TimePickerFineGrained />
    </div>
  </div>
)
