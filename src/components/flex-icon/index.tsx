import type { FC } from 'hono/jsx'

interface IconProps {
  name: string
  size?: '3' | '4' | '5' | '6' | '7' | '8' | '9'
  label?: string
}

export const Icon: FC<IconProps> = ({ name, size, label }) => {
  if (label) {
    return (
      <svg
        class="flex-icon"
        data-size={size}
        role="img"
        aria-label={label}
        focusable="false"
      >
        <use href={`/static/sprite.svg#${name}`} />
      </svg>
    )
  }
  return (
    <svg
      class="flex-icon"
      data-size={size}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`/static/sprite.svg#${name}`} />
    </svg>
  )
}
