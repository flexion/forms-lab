import type { FC } from 'hono/jsx'
import type { DemoFixture } from '../../../../../fixtures/index'
import type { DataCollectionSpec } from '../../../../services/data-collection/types'
import type { FormSpec } from '../../../../services/forms/types'
import type {
  FieldConfidence,
  StoredProject,
} from '../../../../services/ingestion/types'
import { resolveUrl } from '../../../../shared/base-path'

export const ProjectList: FC<{ projects: StoredProject[] }> = ({
  projects,
}) => (
  <div class="l-stack">
    <div class="l-cluster justify-between">
      <h1>My Projects</h1>
      <a href={resolveUrl('/projects/new')} class="flex-button">
        New Project
      </a>
    </div>
    {projects.length === 0 ? (
      <p>No projects yet. Create one to get started.</p>
    ) : (
      <table class="flex-table" data-variant="borderless" data-stacked>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const fieldCount =
              p.spec?.groups.reduce(
                (sum, g) => sum + g.requirements.length,
                0,
              ) ?? 0
            const created = new Date(p.createdAt * 1000).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric', year: 'numeric' },
            )
            return (
              <tr key={p.id}>
                <td data-label="Name">
                  <a href={resolveUrl(`/projects/${p.id}`)}>
                    <strong>{p.name}</strong>
                  </a>
                  <div class="text-muted text-sm">
                    {p.status === 'ready'
                      ? `${p.spec?.groups.length ?? 0} groups, ${fieldCount} fields`
                      : p.status === 'extracting'
                        ? 'Extracting form structure...'
                        : p.description}
                  </div>
                </td>
                <td data-label="Status">
                  <span class="badge" data-status={p.status}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </td>
                <td data-label="Created" class="text-muted text-sm">
                  {created}
                </td>
                <td data-label="Actions">
                  {p.status !== 'extracting' && (
                    <div class="l-cluster">
                      <a
                        href={resolveUrl(`/projects/${p.id}`)}
                        aria-label={`View ${p.name}`}
                      >
                        View
                      </a>
                      <form
                        method="post"
                        action={resolveUrl(`/projects/${p.id}/delete`)}
                        onsubmit="return confirm('Delete this project?')"
                      >
                        <button
                          type="submit"
                          class="delete-confirm__trigger"
                          aria-label={`Delete ${p.name}`}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )}
  </div>
)

export const NewProjectPage: FC<{ fixtures: DemoFixture[] }> = ({
  fixtures,
}) => (
  <div class="l-stack">
    <h1>New Project</h1>

    <section class="l-stack">
      <h2>Start from a demo form</h2>
      <div class="l-grid">
        {fixtures.map((f) => (
          <form method="post" action={resolveUrl('/projects')}>
            <input type="hidden" name="fixture" value={f.slug} />
            <button type="submit" class="flex-card fixture-card">
              <div class="l-stack" style="gap: var(--flex-space-2xs);">
                <strong>{f.name}</strong>
                <span class="text-muted text-sm">{f.description}</span>
              </div>
            </button>
          </form>
        ))}
      </div>
    </section>

    <section class="l-stack">
      <h2>Upload your own PDF</h2>
      <form
        method="post"
        action={resolveUrl('/projects')}
        enctype="multipart/form-data"
      >
        <div class="l-stack">
          <flex-file-input>
            <label class="flex-label" for="pdf-upload">
              PDF form
            </label>
            <span class="flex-file-input__hint" id="pdf-upload-hint">
              Select a government PDF form to extract
            </span>
            <div class="flex-file-input__target">
              <div class="flex-file-input__instructions" aria-hidden="true">
                Drag file here or{' '}
                <span class="flex-file-input__choose">choose from folder</span>
              </div>
              <input
                class="flex-file-input__input"
                id="pdf-upload"
                name="pdf"
                type="file"
                accept=".pdf,application/pdf"
                aria-describedby="pdf-upload-hint"
              />
            </div>
            <div class="flex-file-input__preview-area" />
          </flex-file-input>
          <div>
            <button type="submit" class="flex-button">
              Upload and Extract
            </button>
          </div>
        </div>
      </form>
    </section>
  </div>
)

export const ProjectDetail: FC<{ project: StoredProject }> = ({ project }) => {
  if (project.status === 'extracting') {
    return <ExtractingView project={project} />
  }
  if (project.status === 'error') {
    return <ErrorView project={project} />
  }
  return <ReadyView project={project} />
}

const ExtractingView: FC<{ project: StoredProject }> = ({ project }) => (
  <div class="l-stack">
    <a href={resolveUrl('/projects')} class="project-back-link">
      &larr; Back to projects
    </a>
    <meta http-equiv="refresh" content="3" />
    <h1>{project.name}</h1>
    <div class="flex-alert flex-alert--info" role="status" aria-live="polite">
      <p>
        <strong>Extracting form structure...</strong>
      </p>
      <p>
        This may take up to a minute for large forms. This page will refresh
        automatically.
      </p>
    </div>
  </div>
)

const ErrorView: FC<{ project: StoredProject }> = ({ project }) => (
  <div class="l-stack">
    <a href={resolveUrl('/projects')} class="project-back-link">
      &larr; Back to projects
    </a>
    <h1>{project.name}</h1>
    <div class="flex-alert flex-alert--error" role="alert">
      <p>
        <strong>Extraction failed</strong>
      </p>
      <p>{project.error ?? 'An unknown error occurred.'}</p>
    </div>
    <form method="post" action={resolveUrl(`/projects/${project.id}/retry`)}>
      <button type="submit" class="flex-button">
        Retry Extraction
      </button>
    </form>
  </div>
)

const ReadyView: FC<{ project: StoredProject }> = ({ project }) => {
  const groupCount = project.spec?.groups.length ?? 0
  const fieldCount =
    project.spec?.groups.reduce((sum, g) => sum + g.requirements.length, 0) ?? 0
  const pageCount = project.formSpec?.pages.length ?? 0
  const lowConfCount =
    project.confidence?.filter((c) => c.confidence < 0.8).length ?? 0

  return (
    <div class="l-stack">
      <a href={resolveUrl('/projects')} class="project-back-link">
        &larr; Back to projects
      </a>
      <h1>{project.name}</h1>
      <div class="project-summary">
        <span>
          <strong>{groupCount}</strong> groups
        </span>
        <span>
          <strong>{fieldCount}</strong> fields
        </span>
        <span>
          <strong>{pageCount}</strong> pages
        </span>
        <span>
          <strong>{lowConfCount}</strong> low confidence
        </span>
      </div>
      {project.spec && (
        <SpecViewer spec={project.spec} confidence={project.confidence ?? []} />
      )}
      {project.formSpec && project.spec && (
        <FormSpecViewer formSpec={project.formSpec} spec={project.spec} />
      )}
    </div>
  )
}

const ConfidenceBadge: FC<{ confidence: number; flags?: string[] }> = ({
  confidence,
  flags,
}) => {
  if (confidence >= 0.8) return null
  const level = confidence >= 0.5 ? 'medium' : 'low'
  return (
    <span
      class="badge"
      data-status={level === 'low' ? 'error' : 'draft'}
      title={
        flags?.join(', ') ?? `Confidence: ${Math.round(confidence * 100)}%`
      }
    >
      {level === 'medium' ? 'Review' : 'Low confidence'}
    </span>
  )
}

const SpecViewer: FC<{
  spec: DataCollectionSpec
  confidence: FieldConfidence[]
}> = ({ spec, confidence }) => {
  const confidenceMap = new Map(confidence.map((c) => [c.fieldId, c]))
  return (
    <section class="l-stack">
      <h2>Extracted Data Requirements</h2>
      <p class="text-muted">{spec.description}</p>
      {spec.groups.map((group) => (
        <div key={group.id} class="l-stack">
          <h3>{group.title}</h3>
          {group.description && <p class="text-muted">{group.description}</p>}
          <table class="flex-table" data-variant="borderless" data-stacked>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Type</th>
                <th scope="col">Required</th>
                <th scope="col">Conditions</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {group.requirements.map((req) => {
                const conf = confidenceMap.get(req.id)
                return (
                  <tr key={req.id}>
                    <td data-label="Field">
                      <strong>{req.label}</strong>
                      {req.helpText && (
                        <div class="text-muted text-sm">{req.helpText}</div>
                      )}
                    </td>
                    <td data-label="Type">
                      {req.fieldType.charAt(0).toUpperCase() +
                        req.fieldType.slice(1)}
                    </td>
                    <td data-label="Required">{req.required ? 'Yes' : 'No'}</td>
                    <td data-label="Conditions">
                      {req.condition ? (
                        <span class="condition-tag">
                          When {req.condition.field} {req.condition.operator}{' '}
                          {String(req.condition.value)}
                        </span>
                      ) : (
                        <span class="text-muted">&mdash;</span>
                      )}
                    </td>
                    <td data-label="Status">
                      {conf ? (
                        <ConfidenceBadge
                          confidence={conf.confidence}
                          flags={conf.flags}
                        />
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}

const FormSpecViewer: FC<{
  formSpec: FormSpec
  spec: DataCollectionSpec
}> = ({ formSpec, spec }) => {
  const groupMap = new Map(spec.groups.map((g) => [g.id, g.title]))

  return (
    <section class="l-stack">
      <h2>Form Layout</h2>
      <p class="text-muted">
        Proposed page structure for the digital form experience.
      </p>
      <ol class="form-page-list">
        {formSpec.pages.map((page, i) => (
          <li key={page.id} class="form-page-card">
            <span class="form-page-card__number">{i + 1}.</span>
            <div class="form-page-card__body">
              <span class="form-page-card__title">{page.title}</span>
              {page.description && (
                <div class="text-muted text-sm">{page.description}</div>
              )}
              <div class="form-page-card__groups">
                {page.groups.map((gId) => groupMap.get(gId) ?? gId).join(', ')}
              </div>
            </div>
            <span class="badge">Form Page</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
