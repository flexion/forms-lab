import type { FC } from 'hono/jsx'
import { Tooltip } from './index'

export const TopTooltip: FC = () => (
  <div style="padding: 60px;">
    <Tooltip position="top" label="This is a tooltip">
      Hover me (top)
    </Tooltip>
  </div>
)

export const BottomTooltip: FC = () => (
  <div style="padding: 60px;">
    <Tooltip position="bottom" label="This is a tooltip">
      Hover me (bottom)
    </Tooltip>
  </div>
)

export const LeftTooltip: FC = () => (
  <div style="padding: 60px;">
    <Tooltip position="left" label="This is a tooltip">
      Hover me (left)
    </Tooltip>
  </div>
)

export const RightTooltip: FC = () => (
  <div style="padding: 60px;">
    <Tooltip position="right" label="This is a tooltip">
      Hover me (right)
    </Tooltip>
  </div>
)
