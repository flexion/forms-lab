import type { FC } from 'hono/jsx'

interface CharacterCountProps {
  id: string
  name: string
  label: string
  maxLength: number
  required?: boolean
}

export const CharacterCount: FC<CharacterCountProps> = ({
  id,
  name,
  label,
  maxLength,
  required,
}) => (
  <flex-character-count data-maxlength={String(maxLength)}>
    <label class="flex-label" for={id}>
      {label}
    </label>
    <textarea
      class="flex-textarea"
      id={id}
      name={name}
      maxlength={String(maxLength)}
      required={required}
      aria-describedby={`${id}-message`}
    />
    <span
      class="flex-character-count__message"
      id={`${id}-message`}
      aria-live="polite"
    >
      {maxLength} characters allowed
    </span>
  </flex-character-count>
)
