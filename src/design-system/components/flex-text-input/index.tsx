import type { FC } from 'hono/jsx'

interface TextInputProps {
  id?: string
  name?: string
  type?: 'text' | 'email' | 'number' | 'password' | 'search' | 'tel' | 'url'
  state?: 'error' | 'success'
  width?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  placeholder?: string
  value?: string
  ariaDescribedby?: string
}

export const TextInput: FC<TextInputProps> = ({
  id,
  name,
  type = 'text',
  state,
  width,
  disabled,
  readonly,
  required,
  placeholder,
  value,
  ariaDescribedby,
}) => {
  return (
    <input
      class="flex-input"
      id={id}
      name={name}
      type={type}
      data-state={state}
      data-width={width}
      disabled={disabled}
      readonly={readonly}
      required={required}
      placeholder={placeholder}
      value={value}
      aria-describedby={ariaDescribedby}
    />
  )
}
