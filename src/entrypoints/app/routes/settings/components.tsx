import type { FC } from 'hono/jsx'
import { Alert } from '../../../../design-system/components/flex-alert'
import { Button } from '../../../../design-system/components/flex-button'
import {
  Card,
  CardBody,
  CardHeader,
  CardHeading,
} from '../../../../design-system/components/flex-card'
import { Radio } from '../../../../design-system/components/flex-radio'
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

interface VariantLabelProps {
  name: string
  description: string
  catalogPath?: string
}

const VariantLabel: FC<VariantLabelProps> = ({
  name,
  description,
  catalogPath,
}) => (
  <span class="variant-settings__option-label">
    <strong class="variant-settings__option-name">{name}</strong>
    <span class="variant-settings__option-description">
      {' — '}
      {description}
    </span>
    {catalogPath ? (
      <>
        {' '}
        <a class="variant-settings__option-link" href={resolveUrl(catalogPath)}>
          Learn more →
        </a>
      </>
    ) : null}
  </span>
)

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
    <div class="l-stack variant-settings" data-space="lg">
      <header class="variant-settings__header">
        <nav
          class="variant-settings__breadcrumb"
          aria-label="Settings breadcrumb"
        >
          <span>Settings</span>
          <span class="variant-settings__breadcrumb-sep" aria-hidden="true">
            /
          </span>
          <span class="variant-settings__breadcrumb-current">Variants</span>
        </nav>
        <h1 class="variant-settings__title">Variants</h1>
        <p class="variant-settings__lede">
          Choose which LLM variant runs each task. Each variant has its own
          evaluation in the catalog.
        </p>
      </header>

      {saved ? <Alert variant="success">Preferences saved.</Alert> : null}

      <form method="post" action={action} class="l-stack">
        <div class="l-stack">
          {TASKS.map((task) => {
            const variants = registries[task].list()
            const current = selections[task]
            const highlighted = highlightTask === task
            return (
              <div
                key={task}
                id={`task-${task}`}
                class="variant-settings__task"
                data-highlighted={highlighted ? 'true' : undefined}
              >
                <Card>
                  <CardHeader>
                    <CardHeading>{TASK_LABELS[task]}</CardHeading>
                  </CardHeader>
                  <CardBody>
                    {variants.length === 0 ? (
                      <p class="variant-settings__empty">
                        No variants yet — available in a later release.
                      </p>
                    ) : (
                      <div class="variant-settings__options">
                        {variants.map((variant) => (
                          <Radio
                            key={variant.id}
                            tile
                            id={`variant__${task}__${variant.id}`}
                            name={`variant__${task}`}
                            value={variant.id}
                            checked={current === variant.id}
                            label={
                              <VariantLabel
                                name={variant.metadata.name}
                                description={variant.metadata.description}
                                catalogPath={variant.metadata.catalogPath}
                              />
                            }
                          />
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            )
          })}
        </div>
        <div class="l-cluster variant-settings__actions">
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </div>
  )
}
