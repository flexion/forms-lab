import type { FC } from 'hono/jsx'
import { DateRangePicker } from './index'

export const DefaultDateRangePicker: FC = () => (
  <DateRangePicker
    startId="start-date"
    startName="start-date"
    startLabel="Start date"
    endId="end-date"
    endName="end-date"
    endLabel="End date"
  />
)

export const DateRangePickerWithConstraints: FC = () => (
  <DateRangePicker
    startId="trip-start"
    startName="trip-start"
    startLabel="Trip start"
    endId="trip-end"
    endName="trip-end"
    endLabel="Trip end"
    minDate="2024-01-01"
    maxDate="2030-12-31"
  />
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default</h3>
      <DefaultDateRangePicker />
    </div>
    <div>
      <h3>With date constraints</h3>
      <DateRangePickerWithConstraints />
    </div>
  </div>
)
