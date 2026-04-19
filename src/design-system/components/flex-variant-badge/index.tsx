import type { FC } from 'hono/jsx'
import type { Task } from '../../../services/variant-preferences/types'
import { resolveUrl } from '../../../shared/base-path'

interface VariantBadgeProps {
  task: Task
  variantId: string
  variantName: string
}

const VERB_BY_TASK: Record<Task, string> = {
  extraction: 'Extracted by',
  shaping: 'Shaped by',
  filling: 'Guided by',
  'field-mapping': 'Mapped by',
}

export const VariantBadge: FC<VariantBadgeProps> = ({ task, variantName }) => {
  const verb = VERB_BY_TASK[task]
  const href = resolveUrl(`/settings/variants?task=${task}`)
  return (
    <span class="variant-badge" data-task={task}>
      {verb} <strong>{variantName}</strong> · <a href={href}>change →</a>
    </span>
  )
}
