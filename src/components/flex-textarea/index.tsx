import type { FC } from 'hono/jsx'

interface TextareaProps {
  id?: string
  name?: string
  state?: 'error' | 'success'
  disabled?: boolean
  required?: boolean
  placeholder?: string
  rows?: number
  ariaDescribedby?: string
}

export const Textarea: FC<TextareaProps> = ({
  id,
  name,
  state,
  disabled,
  required,
  placeholder,
  rows,
  ariaDescribedby,
}) => {
  return (
    <textarea
      class="flex-textarea"
      id={id}
      name={name}
      data-state={state}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      rows={rows}
      aria-describedby={ariaDescribedby}
    />
  )
}
