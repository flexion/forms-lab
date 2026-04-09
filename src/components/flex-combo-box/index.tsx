import type { FC } from 'hono/jsx'

interface ComboBoxOption {
  value: string
  label: string
}

interface ComboBoxProps {
  id: string
  name: string
  label: string
  options: ComboBoxOption[]
  defaultValue?: string
  required?: boolean
}

export const ComboBox: FC<ComboBoxProps> = ({
  id,
  name,
  label,
  options,
  defaultValue,
  required,
}) => {
  const listId = `${id}-list`
  const defaultOption = defaultValue
    ? options.find((o) => o.value === defaultValue)
    : undefined

  return (
    <flex-combo-box>
      <label class="flex-label" for={id}>
        {label}
      </label>
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
          value={defaultOption?.label ?? ''}
          data-value={defaultOption?.value ?? ''}
          required={required}
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
          hidden={!defaultValue}
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
              tabindex={-1}
              data-value={opt.value}
              id={`${id}-opt-${opt.value}`}
              aria-selected={defaultValue === opt.value ? 'true' : undefined}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      </div>
    </flex-combo-box>
  )
}
