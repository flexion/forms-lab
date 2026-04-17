import type { FC } from 'hono/jsx'

interface ConfidenceBadgeProps {
  /** Extraction confidence on a 0..1 scale. */
  confidence: number
  /** Optional reviewer-facing flags shown on hover. */
  flags?: string[]
  /**
   * Threshold above which no badge is rendered. Values at or above this level
   * are treated as high confidence and produce `null`. Defaults to `0.8`.
   */
  highThreshold?: number
  /**
   * Threshold above which the field is "medium" confidence (review needed).
   * Values below fall through to "low". Defaults to `0.5`.
   */
  mediumThreshold?: number
}

/**
 * Renders a short badge reflecting extraction confidence.
 *
 * - `>= highThreshold` (default 0.8): nothing rendered (high confidence).
 * - `>= mediumThreshold` (default 0.5): "Review" badge.
 * - otherwise: "Low confidence" badge.
 */
export const ConfidenceBadge: FC<ConfidenceBadgeProps> = ({
  confidence,
  flags,
  highThreshold = 0.8,
  mediumThreshold = 0.5,
}) => {
  if (confidence >= highThreshold) return null
  const level = confidence >= mediumThreshold ? 'medium' : 'low'
  const title =
    flags && flags.length > 0
      ? flags.join(', ')
      : `Confidence: ${Math.round(confidence * 100)}%`
  return (
    <span class="flex-confidence-badge" data-level={level} title={title}>
      {level === 'medium' ? 'Review' : 'Low confidence'}
    </span>
  )
}
