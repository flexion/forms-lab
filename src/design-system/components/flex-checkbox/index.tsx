import type { FC } from 'hono/jsx'

interface CheckboxProps {
  id: string
  name: string
  value: string
  label: string
  checked?: boolean
  disabled?: boolean
  tile?: boolean
  indeterminate?: boolean
  required?: boolean
  state?: 'error'
  ariaDescribedby?: string
}

export const Checkbox: FC<CheckboxProps> = ({
  id,
  name,
  value,
  label,
  checked,
  disabled,
  tile,
  indeterminate,
  required,
  state,
  ariaDescribedby,
}) => {
  return (
    <div
      class="flex-checkbox"
      data-variant={tile ? 'tile' : undefined}
      data-state={state}
    >
      <input
        class="flex-checkbox__input"
        id={id}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        required={required}
        data-indeterminate={indeterminate ? '' : undefined}
        aria-describedby={ariaDescribedby}
      />
      <label class="flex-checkbox__label" for={id}>
        {label}
      </label>
    </div>
  )
}
