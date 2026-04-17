import type { FC } from 'hono/jsx'
import type { FormFieldRequirement } from '../../../../../design-system/components/flex-form-field'
import { FormPageView } from '../../../../../design-system/components/flex-form-page'
import type { SessionUser } from '../../../../../services/auth/session'
import type {
  ProjectView,
  ShapingLogEntry,
} from '../../../../../services/project-service'
import { resolveUrl } from '../../../../../shared/base-path'

function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export const EditorPage: FC<{
  view: ProjectView
  owner: string
  user: SessionUser
  log: ShapingLogEntry[]
}> = ({ view, owner, user: _user, log }) => {
  const { project, formSpec, spec } = view
  const editBase = `/${owner}/${project.slug}/edit`

  if (!formSpec || !spec) {
    return (
      <div class="l-stack">
        <div class="flex-alert" data-variant="info" role="status">
          <div class="flex-alert__body">
            <p class="flex-alert__text">
              No form specification available. The form must be extracted before
              editing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <flex-form-editor
      data-owner={owner}
      data-slug={project.slug}
      data-edit-base={resolveUrl(editBase)}
      data-preview-base={resolveUrl(`/${owner}/${project.slug}/preview`)}
    >
      <script
        type="application/json"
        data-initial-state
        dangerouslySetInnerHTML={{
          __html: safeJsonForScript({ formSpec, dataSpec: spec }),
        }}
      />
      <script
        type="application/json"
        data-shaping-log
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(log) }}
      />

      <div class="editor-layout">
        <div class="editor-breadcrumb">
          <h1>
            <a href={resolveUrl(`/${owner}`)}>{owner}</a>
            {' / '}
            <a href={resolveUrl(`/${owner}/${project.slug}`)}>{project.name}</a>
            {' / '}
            <strong>Edit</strong>
          </h1>
          <button
            type="button"
            class="flex-button editor-breadcrumb__open-assistant"
            data-variant="outline"
            data-action="open-assistant"
          >
            AI Assistant
          </button>
        </div>

        <aside class="editor-structure">
          <flex-form-structure />
        </aside>

        <div class="editor-preview">
          <div class="editor-preview__inner">
            <iframe
              class="editor-preview-frame"
              src={resolveUrl(`/${owner}/${project.slug}/preview?page=0`)}
              title="Form preview"
            />
          </div>
        </div>

        <aside class="editor-assistant">
          <flex-assistant />
        </aside>
      </div>
    </flex-form-editor>
  )
}

export const PreviewPage: FC<{
  view: ProjectView
  pageIndex: number
}> = ({ view, pageIndex }) => {
  if (!view.formSpec || !view.spec) return <p>No form.</p>
  const page = view.formSpec.pages[pageIndex]
  if (!page) return <p>Page not found.</p>
  const groupMap = new Map(view.spec.groups.map((g) => [g.id, g]))

  const groups = page.groups
    .map((gid) => {
      const group = groupMap.get(gid)
      if (!group) return null
      return {
        id: group.id,
        title: group.title,
        description: group.description,
        requirements: group.requirements.map(
          (r) => r as unknown as FormFieldRequirement,
        ),
      }
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Preview: {page.title}</title>
        <link rel="stylesheet" href={`${resolveUrl('/static/styles.css')}`} />
      </head>
      <body style="padding: var(--flex-space-3);">
        <FormPageView
          page={{ title: page.title, description: page.description, groups }}
          actionUrl="#"
          currentPage={pageIndex + 1}
          totalPages={view.formSpec.pages.length}
          fields={{}}
          errors={[]}
          prevUrl={null}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.querySelectorAll("form").forEach(function(f){f.addEventListener("submit",function(e){e.preventDefault()})})',
          }}
        />
      </body>
    </html>
  )
}
