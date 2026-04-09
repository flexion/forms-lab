import type { FC } from 'hono/jsx'
import { DatePicker } from '../flex-date-picker/index'

interface DateRangePickerProps {
  startId: string
  startName: string
  startLabel: string
  endId: string
  endName: string
  endLabel: string
  minDate?: string
  maxDate?: string
}

export const DateRangePicker: FC<DateRangePickerProps> = ({
  startId,
  startName,
  startLabel,
  endId,
  endName,
  endLabel,
  minDate,
  maxDate,
}) => (
  <flex-date-range-picker>
    <div class="flex-date-range-picker__range-start">
      <DatePicker
        id={startId}
        name={startName}
        label={startLabel}
        minDate={minDate}
        maxDate={maxDate}
      />
    </div>
    <div class="flex-date-range-picker__range-end">
      <DatePicker
        id={endId}
        name={endName}
        label={endLabel}
        minDate={minDate}
        maxDate={maxDate}
      />
    </div>
  </flex-date-range-picker>
)
