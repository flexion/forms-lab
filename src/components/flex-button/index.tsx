import type { Child, FC } from 'hono/jsx'

interface ButtonProps {
  variant?:
    | 'secondary'
    | 'accent-cool'
    | 'accent-warm'
    | 'base'
    | 'outline'
    | 'inverse'
    | 'unstyled'
  size?: 'big' | 'small'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  href?: string
  children: Child
}

export const Button: FC<ButtonProps> = ({
  variant,
  size,
  disabled,
  type = 'button',
  href,
  children,
}) => {
  if (href && !disabled) {
    return (
      <a
        class="flex-button"
        data-variant={variant}
        data-size={size}
        href={href}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      class="flex-button"
      data-variant={variant}
      data-size={size}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
