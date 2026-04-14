import type { FC } from 'hono/jsx'
import type { SessionUser } from '../../../../../services/auth/session'
import type { CommitEntry } from '../../../../../services/form-project-repo'
import type { FormSpecDiff } from '../../../../../services/forms/shaping/types'
import type {
  DeliveryMode,
  FormSpec,
} from '../../../../../services/forms/types'
import type { ProjectView } from '../../../../../services/project-service'
import { resolveUrl } from '../../../../../shared/base-path'

// ---------------------------------------------------------------------------
// EditorPage — main two-panel layout
// ---------------------------------------------------------------------------

export const EditorPage: FC<{
  view: ProjectView
  owner: string
  user: SessionUser
  diff?: FormSpecDiff | null
  proposedSpec?: FormSpec | null
  history?: CommitEntry[]
  error?: string | null
  intentValue?: string
}> = ({
  view,
  owner,
  user: _user,
  diff,
  proposedSpec,
  history,
  error,
  intentValue,
}) => {
  const { project, formSpec, spec } = view
  const editBase = `/${owner}/${project.slug}/edit`

  return (
    <div class="l-stack">
      <div class="l-cluster justify-between">
        <h1>
          <a href={resolveUrl(`/${owner}`)} class="text-muted">
            {owner}
          </a>{' '}
          / <a href={resolveUrl(`/${owner}/${project.slug}`)}>{project.name}</a>{' '}
          / Edit
        </h1>
      </div>

      {error && (
        <div class="flex-alert flex-alert--error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div class="editor-layout">
        <div class="editor-panel editor-panel--main">
          {formSpec && spec ? (
            <>
              <IntentForm editBase={editBase} intentValue={intentValue} />

              {diff && proposedSpec && (
                <DiffView
                  diff={diff}
                  editBase={editBase}
                  proposedSpec={proposedSpec}
                />
              )}

              <PageList formSpec={formSpec} spec={spec} editBase={editBase} />

              <HistoryPanel history={history ?? []} editBase={editBase} />
            </>
          ) : (
            <div class="flex-alert flex-alert--info" role="status">
              <p>
                No form specification available. The form must be extracted
                before editing.
              </p>
            </div>
          )}
        </div>

        <div class="editor-panel editor-panel--preview">
          <h2>Preview</h2>
          {formSpec ? (
            <iframe
              class="editor-preview-frame"
              src={resolveUrl(`/${owner}/${project.slug}/preview`)}
              title="Form preview"
            />
          ) : (
            <p class="text-muted">No form to preview.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// IntentForm — natural language input
// ---------------------------------------------------------------------------

const IntentForm: FC<{
  editBase: string
  intentValue?: string
}> = ({ editBase, intentValue }) => (
  <section class="editor-section">
    <h2>Reshape with AI</h2>
    <form method="post" action={resolveUrl(`${editBase}/intent`)}>
      <div class="l-stack" data-space="sm">
        <label class="flex-label" for="intent-input">
          Describe how you want to change the form
        </label>
        <textarea
          class="flex-textarea"
          id="intent-input"
          name="intent"
          rows={3}
          placeholder="e.g., Move the address fields to their own page, make eligibility a screener..."
        >
          {intentValue ?? ''}
        </textarea>
        <div>
          <button type="submit" class="flex-button">
            Generate changes
          </button>
        </div>
      </div>
    </form>
  </section>
)

// ---------------------------------------------------------------------------
// DiffView — proposed changes with accept/reject
// ---------------------------------------------------------------------------

export const DiffView: FC<{
  diff: FormSpecDiff
  editBase: string
  proposedSpec: FormSpec
}> = ({ diff, editBase, proposedSpec }) => (
  <section class="editor-section editor-diff">
    <h2>Proposed changes</h2>
    <p class="text-muted">{diff.summary}</p>

    {diff.hasChanges && (
      <ul class="editor-diff__pages">
        {diff.pages
          .filter((p) => p.status !== 'unchanged')
          .map((page) => (
            <li
              key={page.id}
              class="editor-diff__page"
              data-status={page.status}
            >
              <span class="editor-diff__status">{page.status}</span>
              <span class="editor-diff__title">{page.title}</span>
              {page.details && (
                <span class="text-muted text-sm">{page.details}</span>
              )}
            </li>
          ))}
      </ul>
    )}

    <div class="l-cluster">
      <form method="post" action={resolveUrl(`${editBase}/accept`)}>
        <input
          type="hidden"
          name="proposedSpec"
          value={JSON.stringify(proposedSpec)}
        />
        <button type="submit" class="flex-button">
          Accept changes
        </button>
      </form>
      <form method="post" action={resolveUrl(`${editBase}/reject`)}>
        <button type="submit" class="flex-button" data-variant="outline">
          Discard
        </button>
      </form>
    </div>
  </section>
)

// ---------------------------------------------------------------------------
// PageList — current pages with reorder and delivery mode controls
// ---------------------------------------------------------------------------

const PageList: FC<{
  formSpec: FormSpec
  spec: { groups: Array<{ id: string; title: string }> }
  editBase: string
}> = ({ formSpec, spec, editBase }) => {
  const groupMap = new Map(spec.groups.map((g) => [g.id, g.title]))

  return (
    <section class="editor-section">
      <h2>Pages</h2>
      <ol class="editor-page-list">
        {formSpec.pages.map((page, i) => (
          <li key={page.id} class="editor-page-card">
            <div class="editor-page-card__header">
              <span class="editor-page-card__number">{i + 1}.</span>
              <span class="editor-page-card__title">{page.title}</span>
              <div class="editor-page-card__actions">
                {i > 0 && (
                  <form
                    method="post"
                    action={resolveUrl(`${editBase}/reorder`)}
                    style="display:inline"
                  >
                    <input type="hidden" name="pageId" value={page.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      class="editor-page-card__move-btn"
                      aria-label={`Move ${page.title} up`}
                      title="Move up"
                    >
                      &uarr;
                    </button>
                  </form>
                )}
                {i < formSpec.pages.length - 1 && (
                  <form
                    method="post"
                    action={resolveUrl(`${editBase}/reorder`)}
                    style="display:inline"
                  >
                    <input type="hidden" name="pageId" value={page.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      class="editor-page-card__move-btn"
                      aria-label={`Move ${page.title} down`}
                      title="Move down"
                    >
                      &darr;
                    </button>
                  </form>
                )}
              </div>
            </div>
            {page.description && (
              <p class="text-muted text-sm">{page.description}</p>
            )}
            <div class="editor-page-card__groups">
              {page.groups.map((gId) => groupMap.get(gId) ?? gId).join(', ')}
            </div>
            <DeliveryModeSelect
              editBase={editBase}
              pageId={page.id}
              currentMode={page.deliveryMode ?? 'static'}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------------------
// DeliveryModeSelect — per-page delivery mode picker
// ---------------------------------------------------------------------------

const DELIVERY_MODES: { value: DeliveryMode; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'hybrid', label: 'Hybrid' },
]

const DeliveryModeSelect: FC<{
  editBase: string
  pageId: string
  currentMode: DeliveryMode
}> = ({ editBase, pageId, currentMode }) => (
  <form
    method="post"
    action={resolveUrl(`${editBase}/delivery-mode`)}
    class="editor-delivery-form"
  >
    <input type="hidden" name="pageId" value={pageId} />
    <label class="text-sm" for={`mode-${pageId}`}>
      Delivery:
    </label>
    <select
      class="flex-select editor-delivery-select"
      id={`mode-${pageId}`}
      name="deliveryMode"
    >
      {DELIVERY_MODES.map((m) => (
        <option
          key={m.value}
          value={m.value}
          selected={m.value === currentMode}
        >
          {m.label}
        </option>
      ))}
    </select>
    <button
      type="submit"
      class="flex-button editor-delivery-btn"
      data-variant="outline"
    >
      Set
    </button>
  </form>
)

// ---------------------------------------------------------------------------
// HistoryPanel — form spec edit history with undo buttons
// ---------------------------------------------------------------------------

const HistoryPanel: FC<{
  history: CommitEntry[]
  editBase: string
}> = ({ history, editBase }) => {
  if (history.length === 0) return null

  return (
    <section class="editor-section">
      <h2>Edit history</h2>
      <ul class="editor-history">
        {history.map((entry, i) => (
          <li key={entry.sha} class="editor-history__entry">
            <div>
              <code class="text-sm">{entry.shortSha}</code>{' '}
              <span>{entry.message}</span>
              <span class="text-muted text-sm"> — {entry.date}</span>
            </div>
            {i > 0 && (
              <form method="post" action={resolveUrl(`${editBase}/undo`)}>
                <input type="hidden" name="targetSha" value={entry.sha} />
                <button
                  type="submit"
                  class="flex-button"
                  data-variant="outline"
                >
                  Revert to this
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// PreviewPage — simplified form page rendering for iframe
// ---------------------------------------------------------------------------

export const PreviewPage: FC<{
  formSpec: FormSpec
  spec: {
    groups: Array<{
      id: string
      title: string
      requirements: Array<{ id: string; label: string; fieldType: string }>
    }>
  }
}> = ({ formSpec, spec }) => {
  const groupMap = new Map(spec.groups.map((g) => [g.id, g]))

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Form Preview</title>
        <link rel="stylesheet" href={resolveUrl('/static/styles.css')} />
      </head>
      <body>
        <main class="l-page-content">
          <div class="l-stack">
            <h1>{formSpec.title}</h1>
            {formSpec.pages.map((page, i) => {
              const groups = page.groups
                .map((gId) => groupMap.get(gId))
                .filter(Boolean)

              return (
                <section key={page.id} class="preview-page">
                  <h2>
                    Page {i + 1}: {page.title}
                  </h2>
                  {page.description && (
                    <p class="text-muted">{page.description}</p>
                  )}
                  <span
                    class="badge"
                    data-delivery={page.deliveryMode ?? 'static'}
                  >
                    {(page.deliveryMode ?? 'static').charAt(0).toUpperCase() +
                      (page.deliveryMode ?? 'static').slice(1)}
                  </span>
                  {groups.map((group) =>
                    group ? (
                      <div key={group.id} class="preview-group">
                        <h3>{group.title}</h3>
                        <ul class="preview-fields">
                          {group.requirements.map((req) => (
                            <li key={req.id} class="preview-field">
                              <span class="preview-field__label">
                                {req.label}
                              </span>
                              <span class="preview-field__type text-muted text-sm">
                                {req.fieldType}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </section>
              )
            })}
          </div>
        </main>
      </body>
    </html>
  )
}
