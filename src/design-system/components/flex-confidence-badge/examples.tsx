import type { FC } from 'hono/jsx'
import { ConfidenceBadge } from './index'

/** High confidence — renders nothing (confidence >= 0.8 threshold). */
export const HighConfidence: FC = () => (
  <ConfidenceBadge confidence={0.95} />
)

/** Medium confidence — shows "Review" badge (0.5 <= confidence < 0.8). */
export const NeedsReview: FC = () => (
  <ConfidenceBadge confidence={0.65} />
)

/** Low confidence — shows "Low confidence" badge (confidence < 0.5). */
export const LowConfidence: FC = () => (
  <ConfidenceBadge confidence={0.3} />
)

/** Low confidence with extraction flags shown in the tooltip title. */
export const WithFlags: FC = () => (
  <ConfidenceBadge
    confidence={0.4}
    flags={['ambiguous layout', 'multi-column text']}
  />
)
