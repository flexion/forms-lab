import type { FC } from 'hono/jsx'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  id?: string
  name?: string
  options: SelectOption[]
  disabled?: boolean
  state?: 'error'
  multiple?: boolean
}

export const Select: FC<SelectProps> = ({
  id,
  name,
  options,
  disabled,
  state,
  multiple,
}) => {
  return (
    <select
      class="flex-select"
      id={id}
      name={name}
      disabled={disabled}
      data-state={state}
      multiple={multiple}
    >
      {!multiple && <option value="">- Select -</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
