import type { FC } from 'hono/jsx'
import { Alert } from '../../../../design-system/components/flex-alert'
import { Button } from '../../../../design-system/components/flex-button'
import { Radio } from '../../../../design-system/components/flex-radio'
import type {
  Task,
  TaskRegistries,
} from '../../../../services/variant-preferences'
import { resolveUrl } from '../../../../shared/base-path'

interface TaskMeta {
  label: string
  description: string
  benchmarksPath: string
}

const TASK_META: Record<Task, TaskMeta> = {
  extraction: {
    label: 'Extraction',
    description:
      'Reads a PDF and identifies every field, group, and sensitivity level. Different variants trade off completeness vs. accuracy: some find more fields but make more mistakes, others are highly precise but may miss fields on complex forms. Your choice takes effect the next time you upload a form.',
    benchmarksPath: '/catalog/experiments/pdf-field-extraction',
  },
  shaping: {
    label: 'Shaping',
    description:
      'Interprets your natural-language edit instructions (e.g., "swap pages 2 and 3") and translates them into structured form commands. Larger models handle ambiguous or multi-step requests better; smaller models respond faster for simple edits. Your choice takes effect the next time you describe a change on the edit page.',
    benchmarksPath: '/catalog/experiments/shaping-model-comparison',
  },
  filling: {
    label: 'Conversational filling',
    description:
      'Guides respondents through complex form sections as an adaptive interview. Runs when a section is configured for conversational delivery.',
    benchmarksPath: '/catalog/experiments/roadmap',
  },
  'field-mapping': {
    label: 'Field mapping',
    description:
      "Matches extracted spec fields to the source PDF's AcroForm fields so completed forms can be written back to the original PDF. Runs automatically after extraction.",
    benchmarksPath: '/catalog/experiments/roadmap',
  },
  'authoring-criteria': {
    label: 'Authoring: Criteria Analysis',
    description:
      'Analyzes policy corpus to generate evaluation criteria the form must satisfy. Each criterion links to a specific regulatory citation.',
    benchmarksPath: '/catalog/experiments/authoring-pipeline',
  },
  'authoring-structure': {
    label: 'Authoring: Structure Generation',
    description:
      'Creates page and group structure from approved criteria. Determines form organization based on regulatory requirements.',
    benchmarksPath: '/catalog/experiments/authoring-pipeline',
  },
  'authoring-generation': {
    label: 'Authoring: Field Generation',
    description:
      'Generates form fields per section with appropriate types, labels, and sensitivity based on regulatory text.',
    benchmarksPath: '/catalog/experiments/authoring-pipeline',
  },
}

interface TaskGroup {
  id: string
  label: string
  tasks: Task[]
}

const TASK_GROUPS: TaskGroup[] = [
  {
    id: 'document-processing',
    label: 'Document Processing',
    tasks: ['extraction', 'field-mapping'],
  },
  {
    id: 'form-editing',
    label: 'Form Editing',
    tasks: ['shaping', 'filling'],
  },
  {
    id: 'authoring-pipeline',
    label: 'Authoring Pipeline',
    tasks: [
      'authoring-criteria',
      'authoring-structure',
      'authoring-generation',
    ],
  },
]

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
  const roadmapHref = resolveUrl('/catalog/experiments/roadmap')
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
          Choose which LLM variant runs each task. Your choice takes effect on
          the next run of that task. Every variant is evaluated in the catalog —
          follow the benchmarks link on each task for per-variant results.
        </p>
      </header>

      {saved ? <Alert variant="success">Preferences saved.</Alert> : null}

      <div class="variant-settings__layout">
        <nav class="variant-settings__nav" aria-label="Task groups">
          {TASK_GROUPS.map((group) => (
            <div key={group.id} class="variant-settings__nav-group">
              <span class="variant-settings__nav-group-label">
                {group.label}
              </span>
              <ul class="variant-settings__nav-list">
                {group.tasks.map((task) => (
                  <li key={task}>
                    <a
                      href={`#task-${task}`}
                      class="variant-settings__nav-link"
                    >
                      {TASK_META[task].label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div class="variant-settings__content">
          <form method="post" action={action} class="l-stack">
            {TASK_GROUPS.map((group) => (
              <div key={group.id} class="variant-settings__group">
                <h2 class="variant-settings__group-heading">{group.label}</h2>
                {group.tasks.map((task) => {
                  const variants = registries[task].list()
                  const current = selections[task]
                  const highlighted = highlightTask === task
                  const meta = TASK_META[task]
                  const benchmarksHref = resolveUrl(meta.benchmarksPath)
                  return (
                    <section
                      key={task}
                      id={`task-${task}`}
                      class="variant-settings__task"
                      data-highlighted={highlighted ? 'true' : undefined}
                    >
                      <div class="variant-settings__task-header">
                        <div class="variant-settings__task-heading">
                          <h3 class="variant-settings__task-label">
                            {meta.label}
                          </h3>
                          <p class="variant-settings__task-description">
                            {meta.description}
                          </p>
                        </div>
                        <a
                          class="variant-settings__task-benchmarks"
                          href={benchmarksHref}
                        >
                          View benchmarks →
                        </a>
                      </div>

                      {variants.length === 0 ? (
                        <p class="variant-settings__empty">
                          No variants yet — available in a later release. See
                          the{' '}
                          <a
                            class="variant-settings__option-link"
                            href={roadmapHref}
                          >
                            experiment roadmap
                          </a>{' '}
                          for what's planned.
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
                    </section>
                  )
                })}
              </div>
            ))}
            <div class="l-cluster variant-settings__actions">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
