import type { FC } from 'hono/jsx'

interface MemorableDateProps {
  id: string
  legend: string
  required?: boolean
  monthLabel?: string
  dayLabel?: string
  yearLabel?: string
}

export const MemorableDate: FC<MemorableDateProps> = ({
  id,
  legend,
  required,
  monthLabel = 'Month',
  dayLabel = 'Day',
  yearLabel = 'Year',
}) => (
  <flex-memorable-date>
    <fieldset class="flex-fieldset">
      <legend class="flex-legend">{legend}</legend>
      <div class="flex-memorable-date__fields">
        <div class="flex-memorable-date__field flex-memorable-date__field--month">
          <label class="flex-label" for={`${id}-month`}>
            {monthLabel}
          </label>
          <input
            class="flex-input"
            id={`${id}-month`}
            name={`${id}-month`}
            type="text"
            maxlength={2}
            pattern="[0-9]*"
            inputmode="numeric"
            required={required}
          />
        </div>
        <div class="flex-memorable-date__field flex-memorable-date__field--day">
          <label class="flex-label" for={`${id}-day`}>
            {dayLabel}
          </label>
          <input
            class="flex-input"
            id={`${id}-day`}
            name={`${id}-day`}
            type="text"
            maxlength={2}
            pattern="[0-9]*"
            inputmode="numeric"
            required={required}
          />
        </div>
        <div class="flex-memorable-date__field flex-memorable-date__field--year">
          <label class="flex-label" for={`${id}-year`}>
            {yearLabel}
          </label>
          <input
            class="flex-input"
            id={`${id}-year`}
            name={`${id}-year`}
            type="text"
            maxlength={4}
            pattern="[0-9]*"
            inputmode="numeric"
            required={required}
          />
        </div>
      </div>
    </fieldset>
  </flex-memorable-date>
)
