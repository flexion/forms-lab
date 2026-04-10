import type { FC } from 'hono/jsx'
import type { DemoFixture } from '../../../../fixtures/index'
import { resolveUrl } from '../../../lib/base-path'
import type {
  DataCollectionSpec,
  FieldConfidence,
  FormSpec,
  StoredProject,
} from '../../../types/models'

export const ProjectList: FC<{ projects: StoredProject[] }> = ({
  projects,
}) => (
  <div class="l-stack">
    <div
      class="l-cluster"
      style="justify-content: space-between; align-items: center;"
    >
      <h1>My Projects</h1>
      <a href={resolveUrl('/projects/new')} class="flex-button">
        New Project
      </a>
    </div>
    {projects.length === 0 ? (
      <p>No projects yet. Create one to get started.</p>
    ) : (
      <ul class="l-stack" style="list-style: none; padding: 0;">
        {projects.map((p) => (
          <li key={p.id}>
            <a
              href={resolveUrl(`/projects/${p.id}`)}
              class="flex-card flex-card--flag"
              style="display: block; text-decoration: none; color: inherit;"
            >
              <div class="l-stack" style="gap: var(--flex-space-2xs);">
                <strong>{p.name}</strong>
                <span class="flex-badge" data-status={p.status}>
                  {p.status}
                </span>
                <span style="color: var(--flex-gray-cool-50); font-size: var(--flex-text-sm);">
                  {p.description}
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
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
            <button
              type="submit"
              class="flex-card"
              style="cursor: pointer; text-align: left; width: 100%; border: 1px solid var(--flex-gray-cool-20); background: var(--flex-white);"
            >
              <div class="l-stack" style="gap: var(--flex-space-2xs);">
                <strong>{f.name}</strong>
                <span style="color: var(--flex-gray-cool-50); font-size: var(--flex-text-sm);">
                  {f.description}
                </span>
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

const ReadyView: FC<{ project: StoredProject }> = ({ project }) => (
  <div class="l-stack">
    <h1>{project.name}</h1>
    {project.spec && (
      <SpecViewer spec={project.spec} confidence={project.confidence ?? []} />
    )}
    {project.formSpec && <FormSpecViewer formSpec={project.formSpec} />}
  </div>
)

const ConfidenceBadge: FC<{ confidence: number; flags?: string[] }> = ({
  confidence,
  flags,
}) => {
  if (confidence >= 0.8) return null
  const level = confidence >= 0.5 ? 'medium' : 'low'
  const color =
    level === 'medium'
      ? 'var(--flex-gold-vivid-20)'
      : 'var(--flex-red-cool-vivid-30)'
  return (
    <span
      class="flex-badge"
      style={`background: ${color}; font-size: var(--flex-text-sm);`}
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
      <p>{spec.description}</p>
      {spec.groups.map((group) => (
        <div key={group.id} class="l-stack" style="gap: var(--flex-space-xs);">
          <h3>{group.title}</h3>
          {group.description && <p>{group.description}</p>}
          <table class="flex-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Required</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {group.requirements.map((req) => {
                const conf = confidenceMap.get(req.id)
                return (
                  <tr key={req.id}>
                    <td>
                      <strong>{req.label}</strong>
                      {req.helpText && (
                        <div style="color: var(--flex-gray-cool-50); font-size: var(--flex-text-sm);">
                          {req.helpText}
                        </div>
                      )}
                    </td>
                    <td>{req.fieldType}</td>
                    <td>{req.required ? 'Yes' : 'No'}</td>
                    <td>
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

const FormSpecViewer: FC<{ formSpec: FormSpec }> = ({ formSpec }) => (
  <section class="l-stack">
    <h2>Form Layout</h2>
    <ol class="l-stack">
      {formSpec.pages.map((page) => (
        <li key={page.id} class="l-stack" style="gap: var(--flex-space-2xs);">
          <strong>{page.title}</strong>
          {page.description && <p>{page.description}</p>}
          <span class="flex-badge">{page.deliveryMode}</span>
          <span style="color: var(--flex-gray-cool-50); font-size: var(--flex-text-sm);">
            Groups: {page.groups.join(', ')}
          </span>
        </li>
      ))}
    </ol>
  </section>
)
