import type { FC } from 'hono/jsx'
import { Alert } from '../../../../../design-system/components/flex-alert'
import { BranchSwitcher } from '../../../../../design-system/components/flex-branch-switcher'
import { ChangeIndicator } from '../../../../../design-system/components/flex-change-indicator'
import type { FormFieldRequirement } from '../../../../../design-system/components/flex-form-field'
import { FormPageView } from '../../../../../design-system/components/flex-form-page'
import { VariantBadge } from '../../../../../design-system/components/flex-variant-badge'
import type { SessionUser } from '../../../../../services/auth'
import type {
  AuthoringStage,
  CriteriaSet,
} from '../../../../../services/form-authoring'
import type {
  BranchEntry,
  ProjectView,
  ShapingLogEntry,
} from '../../../../../services/projects'
import { resolveUrl } from '../../../../../shared/base-path'

function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export type EditorPageProps =
  | {
      mode: 'no-branch'
      view: ProjectView
      owner: string
      user: SessionUser
      branches: BranchEntry[]
    }
  | {
      mode: 'editing'
      view: ProjectView
      owner: string
      user: SessionUser
      log: ShapingLogEntry[]
      branch: string
      branches: BranchEntry[]
      changed: { dataSpec: boolean; formSpec: boolean }
      shapingBadge?: { variantId: string; variantName: string } | null
      authoringStage?: AuthoringStage | null
      authoringCriteria?: CriteriaSet | null
      authoringCorpus?: Array<{ source: string; title: string }> | null
    }

export const EditorPage: FC<EditorPageProps> = (props) => {
  if (props.mode === 'no-branch') {
    return <NoBranchShell {...props} />
  }
  return <EditingShell {...props} />
}

const NoBranchShell: FC<{
  view: ProjectView
  owner: string
  user: SessionUser
  branches: BranchEntry[]
}> = ({ view, owner, branches }) => {
  const { project } = view
  return (
    <section class="editor__no-branch l-stack">
      <p class="editor__no-branch-crumbs">
        <a href={resolveUrl(`/${owner}/${project.slug}`)}>
          &larr; Back to {project.name}
        </a>
      </p>
      <h2>Select a branch to edit</h2>
      <p>
        Choose an existing branch or create a new one. The <code>main</code>
        branch is read-only.
      </p>
      <BranchSwitcher
        current="main"
        branches={branches}
        branchHref={(b) => resolveUrl(`/${owner}/${project.slug}/edit/${b}`)}
        createHref={resolveUrl(`/${owner}/${project.slug}/edit/main/branch`)}
      />
    </section>
  )
}

const EditingShell: FC<{
  view: ProjectView
  owner: string
  user: SessionUser
  log: ShapingLogEntry[]
  branch: string
  branches: BranchEntry[]
  changed: { dataSpec: boolean; formSpec: boolean }
  shapingBadge?: { variantId: string; variantName: string } | null
  authoringStage?: AuthoringStage | null
  authoringCriteria?: CriteriaSet | null
  authoringCorpus?: Array<{ source: string; title: string }> | null
}> = ({
  view,
  owner,
  log,
  branch,
  branches,
  changed,
  shapingBadge,
  authoringStage,
  authoringCriteria,
  authoringCorpus,
}) => {
  const { project, formSpec, spec } = view
  const editBase = `/${owner}/${project.slug}/edit/${branch}`
  const previewBase = `/${owner}/${project.slug}/preview/${branch}`
  if (!formSpec || !spec) {
    return (
      <div class="l-stack">
        <Alert variant="info">
          No form specification available. The form must be extracted before
          editing.
        </Alert>
      </div>
    )
  }

  return (
    <flex-form-editor
      data-owner={owner}
      data-slug={project.slug}
      data-branch={branch}
      data-edit-base={resolveUrl(editBase)}
      data-preview-base={resolveUrl(previewBase)}
      data-current-sha={view.currentSha}
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
          <div class="editor-breadcrumb__branch-controls">
            <BranchSwitcher
              current={branch}
              branches={branches}
              branchHref={(b) =>
                resolveUrl(`/${owner}/${project.slug}/edit/${b}`)
              }
              createHref={resolveUrl(
                `/${owner}/${project.slug}/edit/${branch}/branch`,
              )}
            />
            {changed.dataSpec ? (
              <span class="editor-breadcrumb__change">
                <span class="editor-breadcrumb__change-label">Data spec</span>
                <ChangeIndicator variant="modified" />
              </span>
            ) : null}
            {changed.formSpec ? (
              <span class="editor-breadcrumb__change">
                <span class="editor-breadcrumb__change-label">Form spec</span>
                <ChangeIndicator variant="modified" />
              </span>
            ) : null}
            {shapingBadge ? (
              <VariantBadge
                task="shaping"
                variantId={shapingBadge.variantId}
                variantName={shapingBadge.variantName}
              />
            ) : null}
            {branch !== 'main' ? (
              <a
                href={resolveUrl(
                  `/${owner}/${project.slug}/compare/main...${branch}`,
                )}
                class="flex-button editor-breadcrumb__review-link"
                data-variant="outline"
              >
                Review changes
              </a>
            ) : null}
          </div>
          <div class="editor-breadcrumb__actions">
            <div class="editor-breadcrumb__staged">
              <button
                type="button"
                class="flex-button"
                data-variant="ghost"
                data-action="toggle-staged"
                hidden
              >
                <span data-staged-count>0</span> pending
              </button>
              <flex-staged-changes hidden />
            </div>
            <button
              type="button"
              class="flex-button"
              data-variant="outline"
              data-action="discard-staged"
              hidden
            >
              Discard
            </button>
            <button
              type="button"
              class="flex-button"
              data-action="save-staged"
              hidden
            >
              Save
            </button>
            <a
              class="flex-button"
              data-variant="outline"
              href={resolveUrl(previewBase)}
              target="_blank"
              rel="noopener"
            >
              Preview as applicant
            </a>
            <button
              type="button"
              class="flex-button editor-breadcrumb__open-assistant"
              data-variant="outline"
              data-action="open-assistant"
            >
              Assistant
            </button>
          </div>
        </div>

        <aside class="editor-structure">
          <flex-form-structure />
          {authoringCorpus && authoringCorpus.length > 0 ? (
            <div class="editor-references">
              <details class="editor-references__details" open>
                <summary class="editor-references__summary">
                  References ({authoringCorpus.length})
                </summary>
                <ul class="editor-references__list">
                  {authoringCorpus.map((c, i) => (
                    <li class="editor-references__item">
                      <button
                        type="button"
                        class="editor-references__link"
                        data-reference-index={i}
                      >
                        {c.source}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ) : null}
        </aside>

        <div class="editor-preview">
          <flex-editable-page />
        </div>

        <aside class="editor-assistant">
          {authoringStage ? (
            <flex-sidebar-tabs data-default-tab="pipeline">
              <div class="sidebar-tabs__header">
                <button
                  type="button"
                  class="sidebar-tabs__tab"
                  data-tab="pipeline"
                  data-active
                >
                  Pipeline
                </button>
                <button
                  type="button"
                  class="sidebar-tabs__tab"
                  data-tab="assistant"
                >
                  Assistant
                </button>
              </div>
              <div class="sidebar-tabs__panel" data-tab-panel="pipeline">
                <flex-pipeline-panel>
                  <script
                    type="application/json"
                    data-pipeline-state
                    dangerouslySetInnerHTML={{
                      __html: safeJsonForScript({
                        stage: authoringStage,
                        criteria: authoringCriteria ?? {
                          criteria: [],
                          approvedAt: null,
                        },
                        editBase: resolveUrl(editBase),
                        groups: spec
                          ? spec.groups.map((g) => ({
                              id: g.id,
                              title: g.title,
                              fieldCount: g.requirements.length,
                            }))
                          : [],
                        corpus: authoringCorpus ?? [],
                      }),
                    }}
                  />
                </flex-pipeline-panel>
              </div>
              <div
                class="sidebar-tabs__panel"
                data-tab-panel="assistant"
                hidden
              >
                <flex-assistant />
              </div>
            </flex-sidebar-tabs>
          ) : (
            <flex-assistant />
          )}
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

  const totalPages = view.formSpec.pages.length
  const isLast = pageIndex >= totalPages - 1
  const nextIndex = isLast ? pageIndex : pageIndex + 1
  const prevUrl = pageIndex > 0 ? `?page=${pageIndex - 1}` : null
  // The form submits with method="post" to actionUrl; on the preview we
  // don't actually post, so navigate to the next page client-side.
  const previewScript = `
    document.querySelectorAll("form").forEach(function(f){
      f.addEventListener("submit", function(e){
        e.preventDefault();
        window.location.search = ${JSON.stringify(isLast ? `?page=${pageIndex}` : `?page=${nextIndex}`)};
      });
    });
  `

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Preview: {page.title}</title>
        <link rel="stylesheet" href={`${resolveUrl('/static/styles.css')}`} />
      </head>
      <body style="padding: var(--flex-space-lg);">
        <div
          role="status"
          style="max-inline-size: 60rem; margin-inline: auto; margin-block-end: var(--flex-space-md); padding: var(--flex-space-sm) var(--flex-space-md); border: 1px dashed var(--flex-color-border); border-radius: var(--flex-radius-sm); color: var(--flex-color-text-muted); font-size: var(--flex-text-sm);"
        >
          Previewing as an applicant would see the form — no data is submitted.
        </div>
        <FormPageView
          page={{ title: page.title, description: page.description, groups }}
          actionUrl="#"
          currentPage={pageIndex + 1}
          totalPages={totalPages}
          fields={{}}
          errors={[]}
          prevUrl={prevUrl}
        />
        <script dangerouslySetInnerHTML={{ __html: previewScript }} />
        {/* Load the design-system web components so client-side controls
            (date picker, combo box, etc.) hydrate. */}
        <script
          type="module"
          src={resolveUrl('/static/components.js')}
        ></script>
      </body>
    </html>
  )
}
