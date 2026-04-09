import type { Child, FC } from 'hono/jsx'

interface TooltipProps {
  position?: 'top' | 'bottom' | 'left' | 'right'
  label: string
  children: Child
}

let tooltipIdCounter = 0

export const Tooltip: FC<TooltipProps> = ({
  position = 'top',
  label,
  children,
}) => {
  const tipId = `tooltip-${++tooltipIdCounter}`
  return (
    <flex-tooltip data-position={position}>
      <button
        type="button"
        class="flex-tooltip__trigger"
        aria-describedby={tipId}
      >
        {children}
      </button>
      <span class="flex-tooltip__body" id={tipId} role="tooltip">
        {label}
      </span>
    </flex-tooltip>
  )
}
