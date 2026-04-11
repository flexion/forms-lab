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
