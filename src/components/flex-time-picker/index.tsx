import type { FC } from 'hono/jsx'

interface TimePickerProps {
  id: string
  name: string
  label: string
  minTime?: string
  maxTime?: string
  step?: number
}

export const TimePicker: FC<TimePickerProps> = ({
  id,
  name,
  label,
  minTime = '00:00',
  maxTime = '23:59',
  step = 30,
}) => {
  const listId = `${id}-list`
  const options = generateTimeOptions(minTime, maxTime, step)

  return (
    <flex-time-picker
      data-min-time={minTime}
      data-max-time={maxTime}
      data-step={String(step)}
    >
      <label class="flex-label" for={id}>
        {label}
      </label>
      <flex-combo-box>
        <div class="flex-combo-box__wrapper">
          <input
            class="flex-combo-box__input"
            id={id}
            name={name}
            type="text"
            role="combobox"
            aria-expanded="false"
            aria-autocomplete="list"
            aria-controls={listId}
            autocomplete="off"
          />
          <button
            type="button"
            class="flex-combo-box__toggle"
            tabindex={-1}
            aria-label="Toggle options"
          >
            <svg class="flex-icon" aria-hidden="true" focusable="false">
              <use href="/static/sprite.svg#expand_more" />
            </svg>
          </button>
          <button
            type="button"
            class="flex-combo-box__clear"
            tabindex={-1}
            aria-label="Clear selection"
            hidden
          >
            <svg class="flex-icon" aria-hidden="true" focusable="false">
              <use href="/static/sprite.svg#close" />
            </svg>
          </button>
          {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA combobox pattern requires role="listbox" on ul */}
          <ul class="flex-combo-box__list" id={listId} role="listbox" hidden>
            {options.map((opt) => (
              <li
                key={opt.value}
                class="flex-combo-box__option"
                role="option"
                tabindex={-1}
                data-value={opt.value}
                id={`${id}-opt-${opt.value.replace(':', '')}`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      </flex-combo-box>
    </flex-time-picker>
  )
}

interface TimeOption {
  value: string
  label: string
}

function generateTimeOptions(
  minTime: string,
  maxTime: string,
  stepMinutes: number,
): TimeOption[] {
  const options: TimeOption[] = []
  const [minH, minM] = minTime.split(':').map(Number)
  const [maxH, maxM] = maxTime.split(':').map(Number)
  const startMinutes = minH * 60 + minM
  const endMinutes = maxH * 60 + maxM

  for (let m = startMinutes; m <= endMinutes; m += stepMinutes) {
    const hours24 = Math.floor(m / 60)
    const minutes = m % 60
    const value = `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

    // Format as 12-hour with am/pm
    const period = hours24 >= 12 ? 'pm' : 'am'
    const hours12 = hours24 % 12 || 12
    const label = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`

    options.push({ value, label })
  }

  return options
}
