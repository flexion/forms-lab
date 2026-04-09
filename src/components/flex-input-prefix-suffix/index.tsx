import type { Child, FC } from 'hono/jsx'

interface InputGroupProps {
  prefix?: string
  suffix?: string
  state?: 'error' | 'success'
  children: Child
}

export const InputGroup: FC<InputGroupProps> = ({
  prefix,
  suffix,
  state,
  children,
}) => {
  return (
    <div class="flex-input-group" data-state={state}>
      {prefix && (
        <div class="flex-input-group__prefix" aria-hidden="true">
          {prefix}
        </div>
      )}
      {children}
      {suffix && (
        <div class="flex-input-group__suffix" aria-hidden="true">
          {suffix}
        </div>
      )}
    </div>
  )
}
