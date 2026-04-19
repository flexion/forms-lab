import type { Child, FC } from 'hono/jsx'

interface RadioProps {
  id: string
  name: string
  value: string
  /**
   * Label content. Accepts a plain string or arbitrary JSX so callers can
   * render richer content (e.g. a variant name in bold plus a description
   * and follow-up link) while keeping the same visible-label semantics.
   */
  label: Child
  checked?: boolean
  disabled?: boolean
  tile?: boolean
}

export const Radio: FC<RadioProps> = ({
  id,
  name,
  value,
  label,
  checked,
  disabled,
  tile,
}) => {
  return (
    <div class="flex-radio" data-variant={tile ? 'tile' : undefined}>
      <input
        class="flex-radio__input"
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
      />
      <label class="flex-radio__label" for={id}>
        {label}
      </label>
    </div>
  )
}
