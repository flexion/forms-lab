import type { FC } from 'hono/jsx'

interface InputMaskProps {
  id: string
  name: string
  label: string
  mask: string
  inputMode?: 'numeric' | 'tel' | 'text'
  required?: boolean
}

/** Preset masks for common patterns. */
export const masks = {
  phone: '(___) ___-____',
  ssn: '___-__-____',
  zip: '_____-____',
} as const

export const InputMask: FC<InputMaskProps> = ({
  id,
  name,
  label,
  mask,
  inputMode = 'numeric',
  required,
}) => (
  <flex-input-mask data-mask={mask}>
    <label class="flex-label" for={id}>
      {label}
    </label>
    <div class="flex-input-mask__wrapper">
      <input
        class="flex-input flex-input-mask__input"
        id={id}
        name={name}
        type="text"
        inputmode={inputMode}
        required={required}
        placeholder={mask}
      />
      <span class="flex-input-mask__overlay" aria-hidden="true">
        {mask}
      </span>
    </div>
  </flex-input-mask>
)
