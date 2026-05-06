import { type Context, Hono } from 'hono'
import { Breadcrumb } from '../../../../design-system/components/flex-breadcrumb'
import { FormConfirmation } from '../../../../design-system/components/flex-form-confirmation'
import type { FormError } from '../../../../design-system/components/flex-form-error-summary'
import { FormField } from '../../../../design-system/components/flex-form-field'
import { FormLanding } from '../../../../design-system/components/flex-form-landing'
import { FormPageView } from '../../../../design-system/components/flex-form-page'
import { FormReview } from '../../../../design-system/components/flex-form-review'
import { Layout } from '../../../../design-system/components/flex-layout'
import { PreviewBanner } from '../../../../design-system/components/flex-preview-banner'
import type { AccessStore } from '../../../../services/auth'
import type { DataCollectionSpec } from '../../../../services/data-collection'
import type { FieldMapping } from '../../../../services/form-documents'
import { fillPdf } from '../../../../services/form-documents'
import type {
  ConversationGateway,
  FillingAgent,
  FormSessionGateway,
  FormSpec,
  SubmissionGateway,
} from '../../../../services/forms'
import {
  buildReviewPages,
  countVisiblePages,
  evaluateCondition,
  filterVisibleGroups,
  findNextPage,
  findPrevPage,
  resolveFormSpec,
  validateFields,
  visiblePageNumber,
} from '../../../../services/forms'
import { resolveUrl } from '../../../../shared/base-path'
import { requireAuth } from '../../middleware/auth'

/**
 * Specs resolved for a given spec id and optional git ref.
 *
 * `sha` is the commit SHA the specs were resolved at. For in-memory
 * implementations this may be a synthetic version string; for git-backed
 * implementations it should be the actual commit SHA. Submissions are pinned
 * to this value so they remain traceable to the exact form definition that
 * produced them.
 */
interface ResolvedSpecs {
  dataSpec: DataCollectionSpec
  formSpec: FormSpec
  sha: string
}

interface FormRouterDeps {
  sessionGateway: FormSessionGateway
  submissionGateway: SubmissionGateway
  conversationGateway?: ConversationGateway
  fillingAgent?: FillingAgent
  specSnapshotStore?: {
    get(specVersion: string): {
      specVersion: string
      specId: string
      dataCollectionSpec: DataCollectionSpec
      formSpec: FormSpec
      cachedAt: string
    } | null
    put(
      specVersion: string,
      specId: string,
      dataCollectionSpec: DataCollectionSpec,
      formSpec: FormSpec,
    ): void
  }
  getSpecs: (specId: string, ref?: string) => Promise<ResolvedSpecs | null>
  listSpecs: () => Promise<ResolvedSpecs[]>
  /**
   * Optional hook that produces an "Open in editor" href for the preview
   * banner, given a spec id and branch. Returning null (or omitting this
   * dep) suppresses the link.
   */
  getEditHref?: (specId: string, branch: string) => string | null
  getSourcePdf?: (specId: string, specVersion: string) => Promise<Buffer | null>
  getFieldMapping?: (
    specId: string,
    specVersion: string,
  ) => Promise<FieldMapping | null>
  accessStore?: AccessStore
  /** Resolves owner/slug from route context. When provided, routes use
   *  project-scoped URL shapes (/:owner/:slug/forms/...). */
  resolveOwnerSlug?: (c: Context) => { owner: string; slug: string }
  /** Resolves specs for a project by owner/slug. Used in project-scoped mode. */
  getSpecsByProject?: (
    owner: string,
    slug: string,
    ref?: string,
  ) => Promise<ResolvedSpecs | null>
  /** Resolves project info for a specId. Used by My Sessions to build project-scoped URLs. */
  resolveProjectForSpec?: (
    specId: string,
  ) => Promise<{ owner: string; slug: string } | null>
}

const MAIN_BRANCH = 'main'

/**
 * Produce the path prefix for form URLs on a given branch. Main uses the
 * bare `/forms/:specId` shape; other branches get the `/branches/:branch`
 * infix.
 */
function formPathPrefix(specId: string, branch: string): string {
  return branch === MAIN_BRANCH
    ? `/forms/${specId}`
    : `/forms/${specId}/branches/${branch}`
}

function projectFormPathPrefix(
  owner: string,
  slug: string,
  branch: string,
): string {
  const base = `/${owner}/${slug}/forms`
  return branch === MAIN_BRANCH ? base : `${base}/branches/${branch}`
}

function isPreview(branch: string): boolean {
  return branch !== MAIN_BRANCH
}

function previewBannerFor(
  branch: string,
  sha: string,
  getEditHref: FormRouterDeps['getEditHref'],
  specId: string,
) {
  if (!isPreview(branch)) return null
  const editHref = getEditHref?.(specId, branch) ?? undefined
  return <PreviewBanner branch={branch} sha={sha} editHref={editHref} />
}

/**
 * Read the branch out of the current request. Branch-qualified routes are
 * mounted under a sub-router where `:branch` is present as a param; the
 * main-branch routes treat this as `'main'`.
 */
function readBranch(c: Context): string {
  return c.req.param('branch') ?? MAIN_BRANCH
}

export function createFormRouter(deps: FormRouterDeps) {
  const {
    sessionGateway,
    submissionGateway,
    conversationGateway,
    fillingAgent,
    specSnapshotStore,
    getSpecs,
    listSpecs,
    getEditHref,
    getSourcePdf,
    getFieldMapping,
    resolveOwnerSlug,
    getSpecsByProject,
    resolveProjectForSpec,
  } = deps
  const forms = new Hono()

  /**
   * Resolve specs and URL prefix from the request context. In project-scoped
   * mode (resolveOwnerSlug + getSpecsByProject provided), owner/slug come from
   * route params and URLs use the `/:owner/:slug/forms` shape. In legacy mode,
   * specId is read from the `:specId` route param.
   */
  async function resolveFormContext(c: Context): Promise<{
    specs: ResolvedSpecs
    prefix: string
    branch: string
    owner?: string
    slug?: string
  } | null> {
    const branch = readBranch(c)
    if (resolveOwnerSlug && getSpecsByProject) {
      const { owner, slug } = resolveOwnerSlug(c)
      const specs = await getSpecsByProject(owner, slug, branch)
      if (!specs) return null
      return {
        specs,
        prefix: projectFormPathPrefix(owner, slug, branch),
        branch,
        owner,
        slug,
      }
    }
    const specId = c.req.param('specId')
    if (!specId) return null
    const specs = await getSpecs(specId, branch)
    if (!specs) return null
    return { specs, prefix: formPathPrefix(specs.dataSpec.id, branch), branch }
  }

  // All form routes require authentication
  forms.use('*', requireAuth(deps.accessStore))

  // Forms index — only in legacy (non-project-scoped) mode.
  // In project-scoped mode, '/' is the form landing page.
  if (!resolveOwnerSlug) {
    forms.get('/', async (c) => {
      const allSpecs = await listSpecs()
      // Resolve project context for each spec so we can link to project-scoped URLs
      const entries = resolveProjectForSpec
        ? await Promise.all(
            allSpecs.map(async (specs) => ({
              ...specs,
              project: await resolveProjectForSpec(specs.dataSpec.id),
            })),
          )
        : allSpecs.map((specs) => ({
            ...specs,
            project: null as { owner: string; slug: string } | null,
          }))
      return c.html(
        <Layout user={c.get('user')} title="Forms" currentPath="/forms">
          <div class="flex-form" data-size="large">
            <Breadcrumb items={[{ label: 'Forms' }]} />
            <div
              class="l-cluster"
              style="justify-content: space-between; align-items: baseline;"
            >
              <h1>Available Forms</h1>
              <a href={resolveUrl('/forms/sessions')}>My sessions</a>
            </div>
            {entries.length === 0 ? (
              <p>No forms available.</p>
            ) : (
              <table class="flex-table" data-variant="borderless">
                <thead>
                  <tr>
                    <th scope="col">Form</th>
                    <th scope="col">Project</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(({ dataSpec, formSpec, project }) => {
                    const formHref = project
                      ? resolveUrl(`/${project.owner}/${project.slug}/forms`)
                      : '#'
                    return (
                      <tr key={dataSpec.id}>
                        <th scope="row">
                          <a href={formHref}>{formSpec.title}</a>
                        </th>
                        <td>
                          {project ? (
                            <a
                              href={resolveUrl(
                                `/${project.owner}/${project.slug}`,
                              )}
                            >
                              {project.owner}/{project.slug}
                            </a>
                          ) : (
                            '\u2014'
                          )}
                        </td>
                        <td>{formSpec.description ?? ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Layout>,
      )
    })
  }

  // My sessions — only in legacy mode; project-scoped mode
  // will be updated in Task 5.
  if (!resolveOwnerSlug) {
    forms.get('/sessions', async (c) => {
      const user = c.get('user')
      if (!user) return c.text('Unauthorized', 401)
      const sessions = sessionGateway.listByOwner(user.login)
      const active = sessions.filter((s) => s.status === 'active')
      const submitted = sessions.filter((s) => s.status === 'submitted')
      // Resolve titles up front so the JSX below can stay synchronous.
      const uniqueSpecIds = [...new Set(sessions.map((s) => s.specId))]
      const titlesEntries = await Promise.all(
        uniqueSpecIds.map(async (specId) => {
          const specs = await getSpecs(specId)
          return [specId, specs?.formSpec.title ?? specId] as const
        }),
      )
      const titles = new Map<string, string>(titlesEntries)
      // Resolve project context for each spec so active session links
      // can use project-scoped URLs.
      const projectEntries = resolveProjectForSpec
        ? await Promise.all(
            uniqueSpecIds.map(async (specId) => {
              const project = await resolveProjectForSpec(specId)
              return [specId, project] as const
            }),
          )
        : []
      const projectMap = new Map(projectEntries)
      return c.html(
        <Layout user={user} title="My Sessions" currentPath="/forms">
          <div class="flex-form" data-size="large">
            <Breadcrumb
              items={[
                { label: 'Forms', href: resolveUrl('/forms') },
                { label: 'My Sessions' },
              ]}
            />
            <h1>My Sessions</h1>
            {sessions.length === 0 ? (
              <p>
                You have no form sessions.{' '}
                <a href={resolveUrl('/forms')}>Browse available forms</a> to get
                started.
              </p>
            ) : (
              <>
                {active.length > 0 && (
                  <>
                    <h2>In Progress</h2>
                    <ul class="l-stack">
                      {active.map((s) => {
                        const title = titles.get(s.specId) ?? s.specId
                        const project = projectMap.get(s.specId)
                        const sessionHref = project
                          ? resolveUrl(
                              `/${project.owner}/${project.slug}/forms/sessions/${s.id}/pages/0`,
                            )
                          : resolveUrl(
                              `/forms/${s.specId}/sessions/${s.id}/pages/0`,
                            )
                        return (
                          <li key={s.id}>
                            <a href={sessionHref}>
                              <strong>{title}</strong>
                            </a>
                            <span class="u-text-muted">
                              {' '}
                              — started{' '}
                              {new Date(s.createdAt).toLocaleDateString()}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
                {submitted.length > 0 && (
                  <>
                    <h2>Completed</h2>
                    <ul class="l-stack">
                      {submitted.map((s) => {
                        const title = titles.get(s.specId) ?? s.specId
                        return (
                          <li key={s.id}>
                            <a
                              href={resolveUrl(
                                `/forms/sessions/${s.id}/submission`,
                              )}
                            >
                              <strong>{title}</strong>
                            </a>
                            <span class="u-text-muted">
                              {' '}
                              — submitted{' '}
                              {new Date(s.createdAt).toLocaleDateString()}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </Layout>,
      )
    })
  }

  // -----------------------------------------------------------------
  // Handlers — parameterized on branch. In project-scoped mode
  // (resolveOwnerSlug provided), routes use /:owner/:slug/forms/...;
  // in legacy mode, routes use /:specId/...
  // Both call into these handlers with `readBranch(c)` returning the
  // resolved branch name. The preview banner is rendered whenever the
  // branch is non-main.
  // -----------------------------------------------------------------

  async function handleLanding(c: Context) {
    const ctx = await resolveFormContext(c)
    if (!ctx) return c.notFound()
    const { specs, prefix, branch } = ctx
    return c.html(
      <Layout
        user={c.get('user')}
        title={specs.formSpec.title}
        currentPath="/forms"
      >
        {previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)}
        {ctx.owner && ctx.slug && (
          <Breadcrumb
            items={[
              { label: ctx.owner, href: resolveUrl(`/${ctx.owner}`) },
              {
                label: ctx.slug,
                href: resolveUrl(`/${ctx.owner}/${ctx.slug}`),
              },
              { label: 'Forms' },
            ]}
          />
        )}
        <FormLanding
          formSpec={specs.formSpec}
          startUrl={resolveUrl(`${prefix}/sessions`)}
        />
      </Layout>,
    )
  }

  async function handleCreateSession(c: Context) {
    const ctx = await resolveFormContext(c)
    if (!ctx) return c.notFound()
    const { specs, prefix } = ctx
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.createSession(
      specs.dataSpec.id,
      specs.formSpec.id,
      user.login,
      specs.sha,
    )
    return c.redirect(resolveUrl(`${prefix}/sessions/${session.id}/pages/0`))
  }

  async function handleRenderPage(c: Context) {
    const ctx = await resolveFormContext(c)
    const sessionId = c.req.param('sessionId')
    if (!ctx || !sessionId) return c.notFound()
    const { specs, prefix, branch } = ctx
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    const pageIndex = Number(c.req.param('pageIndex'))
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const prev = findPrevPage(resolved, pageIndex, session.fields)
    const prevUrl =
      prev !== null
        ? resolveUrl(`${prefix}/sessions/${session.id}/pages/${prev}`)
        : null
    const page = resolved.pages[pageIndex]
    const deliveryMode = page.page.deliveryMode ?? 'static'
    const showChatToggle =
      (deliveryMode === 'conversational' || deliveryMode === 'hybrid') &&
      conversationGateway &&
      fillingAgent
    return c.html(
      <Layout user={user} title={page.page.title} currentPath="/forms">
        {previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)}
        {ctx.owner && ctx.slug && (
          <Breadcrumb
            items={[
              { label: ctx.owner, href: resolveUrl(`/${ctx.owner}`) },
              {
                label: ctx.slug,
                href: resolveUrl(`/${ctx.owner}/${ctx.slug}`),
              },
              {
                label: 'Forms',
                href: resolveUrl(`/${ctx.owner}/${ctx.slug}/forms`),
              },
              {
                label: `Page ${Number(pageIndex) + 1} of ${specs.formSpec.pages.length}`,
              },
            ]}
          />
        )}
        {showChatToggle && (
          <div class="flex-form" data-size="large">
            <p>
              <a
                href={resolveUrl(
                  `${prefix}/sessions/${session.id}/pages/${pageIndex}/chat`,
                )}
                class="flex-button flex-button--outline"
              >
                Switch to Chat View
              </a>
            </p>
          </div>
        )}
        <FormPageView
          page={{
            title: page.page.title,
            description: page.page.description,
            groups: filterVisibleGroups(page.groups, session.fields),
          }}
          actionUrl={resolveUrl(
            `${prefix}/sessions/${session.id}/pages/${pageIndex}`,
          )}
          currentPage={visiblePageNumber(resolved, pageIndex, session.fields)}
          totalPages={countVisiblePages(resolved, session.fields)}
          fields={session.fields}
          errors={[]}
          prevUrl={prevUrl}
        />
      </Layout>,
    )
  }

  async function handleSubmitPage(c: Context) {
    const ctx = await resolveFormContext(c)
    const sessionId = c.req.param('sessionId')
    if (!ctx || !sessionId) return c.notFound()
    const { specs, prefix, branch } = ctx
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    const pageIndex = Number(c.req.param('pageIndex'))
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const resolvedPage = resolved.pages[pageIndex]

    const requirements = resolvedPage.groups.flatMap((g) => g.requirements)

    const body = await c.req.parseBody()
    const formData: Record<string, string> = {}
    for (const [key, val] of Object.entries(body)) {
      if (typeof val === 'string') formData[key] = val
    }

    const validated = validateFields(formData, requirements, session.fields)
    const hasErrors = Object.values(validated).some(
      (e) => e.errors && e.errors.length > 0,
    )

    if (hasErrors) {
      const mergedFields = { ...session.fields, ...validated }
      const errors: FormError[] = Object.entries(validated)
        .filter(([, entry]) => entry.errors && entry.errors.length > 0)
        .map(([fieldId, entry]) => ({
          fieldId,
          message: (entry.errors as string[])[0],
        }))
      const prev = findPrevPage(resolved, pageIndex, mergedFields)
      const prevUrl =
        prev !== null
          ? resolveUrl(`${prefix}/sessions/${session.id}/pages/${prev}`)
          : null
      return c.html(
        <Layout
          user={user}
          title={`Error: ${resolvedPage.page.title}`}
          currentPath="/forms"
        >
          {previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)}
          {ctx.owner && ctx.slug && (
            <Breadcrumb
              items={[
                { label: ctx.owner, href: resolveUrl(`/${ctx.owner}`) },
                {
                  label: ctx.slug,
                  href: resolveUrl(`/${ctx.owner}/${ctx.slug}`),
                },
                {
                  label: 'Forms',
                  href: resolveUrl(`/${ctx.owner}/${ctx.slug}/forms`),
                },
                {
                  label: `Page ${Number(pageIndex) + 1} of ${specs.formSpec.pages.length}`,
                },
              ]}
            />
          )}
          <FormPageView
            page={{
              title: resolvedPage.page.title,
              description: resolvedPage.page.description,
              groups: filterVisibleGroups(resolvedPage.groups, mergedFields),
            }}
            actionUrl={resolveUrl(
              `${prefix}/sessions/${session.id}/pages/${pageIndex}`,
            )}
            currentPage={visiblePageNumber(resolved, pageIndex, mergedFields)}
            totalPages={countVisiblePages(resolved, mergedFields)}
            fields={mergedFields}
            errors={errors}
            prevUrl={prevUrl}
          />
        </Layout>,
      )
    }

    sessionGateway.writeFields(session.id, validated)
    const updatedSession = sessionGateway.getSession(session.id)
    if (!updatedSession) return c.notFound()
    const next = findNextPage(resolved, pageIndex, updatedSession.fields)
    if (next !== null) {
      return c.redirect(
        resolveUrl(`${prefix}/sessions/${session.id}/pages/${next}`),
      )
    }
    return c.redirect(resolveUrl(`${prefix}/sessions/${session.id}/review`))
  }

  async function handleReview(c: Context) {
    const ctx = await resolveFormContext(c)
    const sessionId = c.req.param('sessionId')
    if (!ctx || !sessionId) return c.notFound()
    const { specs, prefix, branch } = ctx
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    return c.html(
      <Layout user={user} title="Review" currentPath="/forms">
        {previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)}
        {ctx.owner && ctx.slug && (
          <Breadcrumb
            items={[
              { label: ctx.owner, href: resolveUrl(`/${ctx.owner}`) },
              {
                label: ctx.slug,
                href: resolveUrl(`/${ctx.owner}/${ctx.slug}`),
              },
              {
                label: 'Forms',
                href: resolveUrl(`/${ctx.owner}/${ctx.slug}/forms`),
              },
              { label: 'Review' },
            ]}
          />
        )}
        <FormReview
          pages={buildReviewPages(resolved, session.fields)}
          fields={session.fields}
          submitUrl={resolveUrl(`${prefix}/sessions/${session.id}/submit`)}
          editBaseUrl={resolveUrl(`${prefix}/sessions/${session.id}/pages`)}
        />
      </Layout>,
    )
  }

  async function handleSubmit(c: Context) {
    const ctx = await resolveFormContext(c)
    const sessionId = c.req.param('sessionId')
    if (!ctx || !sessionId) return c.notFound()
    const { specs, prefix } = ctx
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    if (session.status === 'submitted') {
      return c.text('This form has already been submitted.', 409)
    }
    const submission = sessionGateway.submit(session.id)
    submissionGateway.save(submission)
    specSnapshotStore?.put(
      specs.sha,
      specs.dataSpec.id,
      specs.dataSpec,
      specs.formSpec,
    )
    return c.redirect(
      resolveUrl(
        `${prefix}/sessions/${session.id}/confirmation?submissionId=${submission.id}`,
      ),
    )
  }

  async function handleConfirmation(c: Context) {
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const submissionId = c.req.query('submissionId')
    if (!submissionId) return c.notFound()
    const submission = submissionGateway.getSubmission(submissionId)
    if (!submission) return c.notFound()
    if (submission.ownerId !== user.login) return c.notFound()
    const ctx = await resolveFormContext(c)
    const branch = readBranch(c)
    return c.html(
      <Layout user={user} title="Confirmation" currentPath="/forms">
        {ctx
          ? previewBannerFor(
              branch,
              ctx.specs.sha,
              getEditHref,
              ctx.specs.dataSpec.id,
            )
          : null}
        {ctx?.owner && ctx?.slug && (
          <Breadcrumb
            items={[
              { label: ctx.owner, href: resolveUrl(`/${ctx.owner}`) },
              {
                label: ctx.slug,
                href: resolveUrl(`/${ctx.owner}/${ctx.slug}`),
              },
              {
                label: 'Forms',
                href: resolveUrl(`/${ctx.owner}/${ctx.slug}/forms`),
              },
              { label: 'Confirmation' },
            ]}
          />
        )}
        <FormConfirmation
          submission={submission}
          pdfDownloadUrl={resolveUrl(
            `/forms/${submission.specId}/submissions/${submission.id}/pdf`,
          )}
        />
      </Layout>,
    )
  }

  async function handleSubmissionDetail(c: Context) {
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const sessionId = c.req.param('sessionId')
    if (!sessionId) return c.notFound()
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    if (session.status !== 'submitted') return c.notFound()

    let dataSpec: DataCollectionSpec | null = null
    let formSpec: FormSpec | null = null
    const snapshot = specSnapshotStore?.get(session.specVersion)
    if (snapshot) {
      dataSpec = snapshot.dataCollectionSpec
      formSpec = snapshot.formSpec
    } else {
      const specs = await getSpecs(session.specId)
      if (specs) {
        dataSpec = specs.dataSpec
        formSpec = specs.formSpec
      }
    }
    if (!dataSpec || !formSpec) return c.notFound()

    const resolved = resolveFormSpec(formSpec, dataSpec)
    const reviewPages = buildReviewPages(resolved, session.fields)

    const submissions = submissionGateway.listByOwner(user.login)
    const submission = submissions.find((s) => s.sessionId === sessionId)

    return c.html(
      <Layout user={user} title="Submission Details" currentPath="/forms">
        <FormReview pages={reviewPages} fields={session.fields} readOnly />
        {submission && (
          <div class="flex-form" data-size="large">
            <p>
              <a
                href={resolveUrl(
                  `/forms/${session.specId}/submissions/${submission.id}/pdf`,
                )}
                class="flex-button flex-button--outline"
              >
                Download completed PDF
              </a>
            </p>
          </div>
        )}
      </Layout>,
    )
  }

  async function handlePdfDownload(c: Context) {
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const submissionId = c.req.param('submissionId')
    if (!submissionId) return c.notFound()

    try {
      const submission = submissionGateway.getSubmission(submissionId)
      if (!submission) return c.notFound()
      if (submission.ownerId !== user.login) return c.notFound()

      if (!getSourcePdf || !getFieldMapping) return c.notFound()

      const sourcePdf = await getSourcePdf(
        submission.specId,
        submission.specVersion,
      )
      if (!sourcePdf) return c.notFound()

      const fieldMapping = await getFieldMapping(
        submission.specId,
        submission.specVersion,
      )
      if (!fieldMapping) return c.notFound()

      const result = await fillPdf(sourcePdf, fieldMapping, submission.data)

      return new Response(result.pdf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${submission.specId}-${submissionId}.pdf"`,
        },
      })
    } catch {
      return c.text('Error generating PDF', 500)
    }
  }

  async function handleChatView(c: Context) {
    const sessionId = c.req.param('sessionId')
    const pageIndex = Number(c.req.param('pageIndex'))
    if (!sessionId || Number.isNaN(pageIndex)) return c.notFound()

    // Check if conversational mode is enabled
    if (!conversationGateway || !fillingAgent) {
      return c.text('Conversational mode not available', 503)
    }

    const ctx = await resolveFormContext(c)
    if (!ctx) return c.notFound()
    const { specs, prefix, branch } = ctx
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()

    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const page = resolved.pages[pageIndex]

    // Check if this page has conversational delivery mode
    const deliveryMode = page.page.deliveryMode ?? 'static'
    if (deliveryMode !== 'conversational' && deliveryMode !== 'hybrid') {
      return c.text('This page does not support conversational mode', 400)
    }

    // Get conversation messages
    let messages = conversationGateway.getMessages(sessionId)

    // If no messages yet, call agent to generate initial greeting
    if (messages.length === 0) {
      const turn = await fillingAgent.advance(
        {
          groups: page.groups,
          collectedFields: session.fields,
          messages: [],
        },
        null,
      )

      // Append assistant's initial message
      const assistantMessageId = crypto.randomUUID()
      conversationGateway.appendMessage(sessionId, {
        id: assistantMessageId,
        sessionId,
        role: 'assistant',
        content: turn.message,
        toolCalls: turn.toolCalls,
        createdAt: new Date().toISOString(),
      })

      messages = conversationGateway.getMessages(sessionId)
    }

    // Check if all required fields have been collected
    const finished = page.groups.every((group) => {
      if (!evaluateCondition(group.condition, session.fields)) return true
      return group.requirements.every((req) => {
        if (!req.required) return true
        if (!evaluateCondition(req.condition, session.fields)) return true
        return req.fieldName in session.fields
      })
    })

    const visibleGroups = filterVisibleGroups(page.groups, session.fields)

    // Prepare initial messages for flex-assistant (strip internal annotations)
    const initialMessages = messages.map((m) => ({
      role: m.role,
      html:
        m.role === 'assistant'
          ? m.content.replace(/\n\[Recorded: [^\]]+\]$/, '')
          : m.content,
    }))

    return c.html(
      <Layout
        user={user}
        title={page.page.title}
        currentPath="/forms"
        contentWidth="full"
      >
        {previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)}
        <div class="conversational-form-layout">
          <div class="conversational-form-layout__form">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-block-end: var(--flex-space-md);">
              <h1 style="margin: 0;">{page.page.title}</h1>
              <a
                href={resolveUrl(
                  `${prefix}/sessions/${session.id}/pages/${pageIndex}`,
                )}
                class="flex-button flex-button--outline flex-button--sm"
              >
                Back to Form View
              </a>
            </div>
            {page.page.description && <p>{page.page.description}</p>}
            {visibleGroups.map((group) => (
              <fieldset key={group.id}>
                <legend>{group.title}</legend>
                {group.description && <p>{group.description}</p>}
                {group.requirements.map((req) => (
                  <FormField
                    key={req.fieldName}
                    requirement={req}
                    entry={session.fields[req.fieldName]}
                  />
                ))}
              </fieldset>
            ))}
            <div
              class="flex-form-nav"
              style="margin-block-start: var(--flex-space-lg);"
            >
              {finished ? (
                <a
                  href={resolveUrl(`${prefix}/sessions/${session.id}/review`)}
                  class="flex-button"
                >
                  Continue to Review
                </a>
              ) : (
                <p style="color: var(--flex-color-text-muted); font-size: var(--flex-text-sm);">
                  Chat with the assistant to complete this section
                </p>
              )}
            </div>
          </div>
          <aside class="conversational-form-layout__assistant">
            <flex-assistant data-session-id={sessionId} />
          </aside>
        </div>
        <script
          type="application/json"
          data-initial-messages
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(initialMessages).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="module"
          src={resolveUrl('/static/conversational-form.js')}
        />
      </Layout>,
    )
  }

  async function handleChatMessage(c: Context) {
    const sessionId = c.req.param('sessionId')
    const pageIndex = Number(c.req.param('pageIndex'))
    if (!sessionId || Number.isNaN(pageIndex)) return c.notFound()

    // Check if conversational mode is enabled
    if (!conversationGateway || !fillingAgent) {
      return c.text('Conversational mode not available', 503)
    }

    const ctx = await resolveFormContext(c)
    if (!ctx) return c.notFound()
    const { specs, prefix } = ctx
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()

    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const page = resolved.pages[pageIndex]

    // Check if this page has conversational delivery mode
    const chatDeliveryMode = page.page.deliveryMode ?? 'static'
    if (
      chatDeliveryMode !== 'conversational' &&
      chatDeliveryMode !== 'hybrid'
    ) {
      return c.text('This page does not support conversational mode', 400)
    }

    // Parse user message
    const body = await c.req.parseBody()
    const userMessage = body.message as string
    if (!userMessage || typeof userMessage !== 'string') {
      return c.text('Missing message', 400)
    }

    // Build context for filling agent BEFORE appending current message
    // The agent expects userMessage to NOT be in the history yet
    // Note: Pass ALL groups (not filtered) because the agent needs to evaluate
    // conditions dynamically as it collects fields
    const messages = conversationGateway.getMessages(sessionId)

    // Call filling agent to advance conversation
    let turn: Awaited<ReturnType<typeof fillingAgent.advance>>
    try {
      turn = await fillingAgent.advance(
        {
          groups: page.groups,
          collectedFields: session.fields,
          messages,
        },
        userMessage,
      )
    } catch (error) {
      console.error('Filling agent error:', error)
      const isLive = c.req.header('X-Live-Chat') === 'true'
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      if (isLive) {
        return c.json({ response: `Error: ${errMsg}`, finished: false })
      }
      return c.text(`Error processing message: ${errMsg}`, 500)
    }

    // Append user and assistant messages to conversation
    const userMessageId = crypto.randomUUID()
    conversationGateway.appendMessage(sessionId, {
      id: userMessageId,
      sessionId,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    })

    // Store assistant message with field collection context so LLM
    // can see what it recorded when the history is replayed as text.
    let storedContent = turn.message
    const collectedEntries = Object.entries(turn.fieldsCollected)
    if (collectedEntries.length > 0) {
      const summary = collectedEntries
        .map(([k, v]) => `${k}=${JSON.stringify(v.value)}`)
        .join(', ')
      storedContent += `\n[Recorded: ${summary}]`
    }

    const assistantMessageId = crypto.randomUUID()
    conversationGateway.appendMessage(sessionId, {
      id: assistantMessageId,
      sessionId,
      role: 'assistant',
      content: storedContent,
      toolCalls: turn.toolCalls,
      createdAt: new Date().toISOString(),
    })

    if (Object.keys(turn.fieldsCollected).length > 0) {
      sessionGateway.writeFields(sessionId, turn.fieldsCollected)
    }

    const isLiveChat = c.req.header('X-Live-Chat') === 'true'

    if (isLiveChat) {
      return c.json({
        response: turn.message,
        finished: turn.finished,
        fieldsCollected: turn.fieldsCollected,
      })
    }

    // Otherwise redirect back to chat view (for non-JS fallback)
    return c.redirect(
      resolveUrl(`${prefix}/sessions/${sessionId}/pages/${pageIndex}/chat`),
    )
  }

  // Submission detail (read-only review of completed form)
  forms.get('/sessions/:sessionId/submission', handleSubmissionDetail)

  if (resolveOwnerSlug) {
    // Project-scoped routes: no :specId param needed
    forms.get('/', handleLanding)
    forms.get('/branches/:branch', handleLanding)
    forms.post('/sessions', handleCreateSession)
    forms.post('/branches/:branch/sessions', handleCreateSession)
    forms.get('/sessions/:sessionId/pages/:pageIndex', handleRenderPage)
    forms.get(
      '/branches/:branch/sessions/:sessionId/pages/:pageIndex',
      handleRenderPage,
    )
    forms.post('/sessions/:sessionId/pages/:pageIndex', handleSubmitPage)
    forms.post(
      '/branches/:branch/sessions/:sessionId/pages/:pageIndex',
      handleSubmitPage,
    )
    forms.get('/sessions/:sessionId/review', handleReview)
    forms.get('/branches/:branch/sessions/:sessionId/review', handleReview)
    forms.post('/sessions/:sessionId/submit', handleSubmit)
    forms.post('/branches/:branch/sessions/:sessionId/submit', handleSubmit)
    forms.get('/sessions/:sessionId/confirmation', handleConfirmation)
    forms.get(
      '/branches/:branch/sessions/:sessionId/confirmation',
      handleConfirmation,
    )
    forms.get('/submissions/:submissionId/pdf', handlePdfDownload)
    // Chat routes
    forms.get('/sessions/:sessionId/pages/:pageIndex/chat', handleChatView)
    forms.get(
      '/branches/:branch/sessions/:sessionId/pages/:pageIndex/chat',
      handleChatView,
    )
    forms.post('/sessions/:sessionId/pages/:pageIndex/chat', handleChatMessage)
    forms.post(
      '/branches/:branch/sessions/:sessionId/pages/:pageIndex/chat',
      handleChatMessage,
    )
  } else {
    // Legacy specId-based routes
    // PDF download
    forms.get('/:specId/submissions/:submissionId/pdf', handlePdfDownload)

    // Form landing page
    forms.get('/:specId', handleLanding)
    forms.get('/:specId/branches/:branch', handleLanding)

    // Create session
    forms.post('/:specId/sessions', handleCreateSession)
    forms.post('/:specId/branches/:branch/sessions', handleCreateSession)

    // Render page
    forms.get('/:specId/sessions/:sessionId/pages/:pageIndex', handleRenderPage)
    forms.get(
      '/:specId/branches/:branch/sessions/:sessionId/pages/:pageIndex',
      handleRenderPage,
    )

    // Submit page (validate and advance)
    forms.post(
      '/:specId/sessions/:sessionId/pages/:pageIndex',
      handleSubmitPage,
    )
    forms.post(
      '/:specId/branches/:branch/sessions/:sessionId/pages/:pageIndex',
      handleSubmitPage,
    )

    // Review page
    forms.get('/:specId/sessions/:sessionId/review', handleReview)
    forms.get(
      '/:specId/branches/:branch/sessions/:sessionId/review',
      handleReview,
    )

    // Submit
    forms.post('/:specId/sessions/:sessionId/submit', handleSubmit)
    forms.post(
      '/:specId/branches/:branch/sessions/:sessionId/submit',
      handleSubmit,
    )

    // Confirmation
    forms.get('/:specId/sessions/:sessionId/confirmation', handleConfirmation)
    forms.get(
      '/:specId/branches/:branch/sessions/:sessionId/confirmation',
      handleConfirmation,
    )

    // Chat view (conversational mode)
    forms.get(
      '/:specId/sessions/:sessionId/pages/:pageIndex/chat',
      handleChatView,
    )
    forms.get(
      '/:specId/branches/:branch/sessions/:sessionId/pages/:pageIndex/chat',
      handleChatView,
    )

    // Chat message (conversational mode)
    forms.post(
      '/:specId/sessions/:sessionId/pages/:pageIndex/chat',
      handleChatMessage,
    )
    forms.post(
      '/:specId/branches/:branch/sessions/:sessionId/pages/:pageIndex/chat',
      handleChatMessage,
    )
  }

  return forms
}
