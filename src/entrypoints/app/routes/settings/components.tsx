import type { FC } from 'hono/jsx'
import { Alert } from '../../../../design-system/components/flex-alert'
import type { TaskRegistries } from '../../../../services/variant-preferences'
import {
  TASKS,
  type Task,
} from '../../../../services/variant-preferences/types'
import { resolveUrl } from '../../../../shared/base-path'

const TASK_LABELS: Record<Task, string> = {
  extraction: 'Extraction',
  shaping: 'Shaping',
  filling: 'Conversational filling',
  'field-mapping': 'Field mapping',
}

interface VariantPickerPageProps {
  registries: TaskRegistries
  selections: Record<Task, string | null>
  highlightTask?: Task
  saved?: boolean
}

export const VariantPickerPage: FC<VariantPickerPageProps> = ({
  registries,
  selections,
  highlightTask,
  saved,
}) => {
  const action = resolveUrl('/settings/variants')
  return (
    <div class="variant-picker">
      <h1>Variants</h1>
      <p>
        Choose which LLM variant runs each task. Each variant has its own
        evaluation in the catalog.
      </p>
      {saved ? <Alert variant="success">Preferences saved.</Alert> : null}
      <form method="post" action={action}>
        {TASKS.map((task) => {
          const variants = registries[task].list()
          const current = selections[task]
          const highlight = highlightTask === task
          return (
            <section
              key={task}
              id={`task-${task}`}
              class={
                highlight
                  ? 'task-section task-section--highlight'
                  : 'task-section'
              }
            >
              <h2>{TASK_LABELS[task]}</h2>
              {variants.length === 0 ? (
                <p class="task-section__empty">
                  No variants yet — added in a later story.
                </p>
              ) : (
                <ul class="variant-list">
                  {variants.map((variant) => (
                    <li key={variant.id} class="variant-option">
                      <label>
                        <input
                          type="radio"
                          name={`variant__${task}`}
                          value={variant.id}
                          checked={current === variant.id}
                        />
                        <strong>{variant.metadata.name}</strong> —{' '}
                        {variant.metadata.description}
                        {variant.metadata.catalogPath ? (
                          <>
                            {' · '}
                            <a href={resolveUrl(variant.metadata.catalogPath)}>
                              Learn more →
                            </a>
                          </>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
        <button type="submit">Save changes</button>
      </form>
    </div>
  )
}
