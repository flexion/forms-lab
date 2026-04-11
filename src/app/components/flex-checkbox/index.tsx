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
}) => {
  return (
    <div class="flex-checkbox" data-variant={tile ? 'tile' : undefined}>
      <input
        class="flex-checkbox__input"
        id={id}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        data-indeterminate={indeterminate ? '' : undefined}
      />
      <label class="flex-checkbox__label" for={id}>
        {label}
      </label>
    </div>
  )
}
