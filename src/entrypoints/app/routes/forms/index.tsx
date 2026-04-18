import { type Context, Hono } from 'hono'
import { FormConfirmation } from '../../../../design-system/components/flex-form-confirmation'
import type { FormError } from '../../../../design-system/components/flex-form-error-summary'
import { FormLanding } from '../../../../design-system/components/flex-form-landing'
import { FormPageView } from '../../../../design-system/components/flex-form-page'
import { FormReview } from '../../../../design-system/components/flex-form-review'
import { Layout } from '../../../../design-system/components/flex-layout'
import { PreviewBanner } from '../../../../design-system/components/flex-preview-banner'
import type {
  DataCollectionSpec,
  RequirementGroup,
} from '../../../../services/data-collection/types'
import { fillPdf } from '../../../../services/form-documents/filling'
import type { FieldMapping } from '../../../../services/form-documents/types'
import {
  countVisiblePages,
  findNextPage,
  findPrevPage,
  visiblePageNumber,
} from '../../../../services/forms/navigation'
import {
  evaluateCondition,
  resolveFormSpec,
} from '../../../../services/forms/resolver'
import type {
  FieldEntry,
  FormSessionGateway,
  FormSpec,
  SubmissionGateway,
} from '../../../../services/forms/types'
import { validateFields } from '../../../../services/forms/validation'
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
}

const MAIN_BRANCH = 'main'

function filterVisibleGroups(
  groups: RequirementGroup[],
  fields: Record<string, FieldEntry>,
) {
  return groups
    .filter((g) => evaluateCondition(g.condition, fields))
    .map((g) => ({
      ...g,
      requirements: g.requirements.filter((r) =>
        evaluateCondition(r.condition, fields),
      ),
    }))
}

function buildReviewPages(
  resolved: ReturnType<typeof resolveFormSpec>,
  fields: Record<string, FieldEntry>,
) {
  return resolved.pages
    .filter((rp) => evaluateCondition(rp.page.condition, fields))
    .map((rp) => ({
      id: rp.page.id,
      title: rp.page.title,
      groups: filterVisibleGroups(rp.groups, fields).map((g) => ({
        id: g.id,
        requirements: g.requirements.map((r) => ({
          fieldName: r.fieldName,
          label: r.label,
        })),
      })),
    }))
}

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
    specSnapshotStore,
    getSpecs,
    listSpecs,
    getEditHref,
    getSourcePdf,
    getFieldMapping,
  } = deps
  const forms = new Hono()

  // All form routes require authentication
  forms.use('*', requireAuth())

  // Forms index
  forms.get('/', async (c) => {
    const allSpecs = await listSpecs()
    return c.html(
      <Layout user={c.get('user')} title="Forms" currentPath="/forms">
        <div class="flex-form" data-size="large">
          <div
            class="l-cluster"
            style="justify-content: space-between; align-items: baseline;"
          >
            <h1>Available Forms</h1>
            <a href={resolveUrl('/forms/sessions')}>My sessions</a>
          </div>
          {allSpecs.length === 0 ? (
            <p>No forms available.</p>
          ) : (
            <table class="flex-table" data-variant="borderless">
              <thead>
                <tr>
                  <th scope="col">Form</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {allSpecs.map(({ dataSpec, formSpec }) => (
                  <tr key={dataSpec.id}>
                    <th scope="row">
                      <a href={resolveUrl(`/forms/${dataSpec.id}`)}>
                        {formSpec.title}
                      </a>
                    </th>
                    <td>{formSpec.description ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Layout>,
    )
  })

  // My sessions
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
    return c.html(
      <Layout user={user} title="My Sessions" currentPath="/forms">
        <div class="flex-form" data-size="large">
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
                      return (
                        <li key={s.id}>
                          <a
                            href={resolveUrl(
                              `/forms/${s.specId}/sessions/${s.id}/pages/0`,
                            )}
                          >
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

  // -----------------------------------------------------------------
  // Handlers — parameterized on branch. Two sub-paths mount each one:
  //   1. /:specId/...            (main branch — the legacy URL shape)
  //   2. /:specId/branches/:branch/...
  // Both call into these handlers with `readBranch(c)` returning the
  // resolved branch name. The preview banner is rendered whenever the
  // branch is non-main.
  // -----------------------------------------------------------------

  async function handleLanding(c: Context) {
    const branch = readBranch(c)
    const specId = c.req.param('specId')
    if (!specId) return c.notFound()
    const specs = await getSpecs(specId, branch)
    if (!specs) return c.notFound()
    const prefix = formPathPrefix(specs.dataSpec.id, branch)
    return c.html(
      <Layout
        user={c.get('user')}
        title={specs.formSpec.title}
        currentPath="/forms"
      >
        {previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)}
        <FormLanding
          formSpec={specs.formSpec}
          startUrl={resolveUrl(`${prefix}/sessions`)}
        />
      </Layout>,
    )
  }

  async function handleCreateSession(c: Context) {
    const branch = readBranch(c)
    const specId = c.req.param('specId')
    if (!specId) return c.notFound()
    const specs = await getSpecs(specId, branch)
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.createSession(
      specs.dataSpec.id,
      specs.formSpec.id,
      user.login,
      specs.sha,
    )
    const prefix = formPathPrefix(specs.dataSpec.id, branch)
    return c.redirect(resolveUrl(`${prefix}/sessions/${session.id}/pages/0`))
  }

  async function handleRenderPage(c: Context) {
    const branch = readBranch(c)
    const specId = c.req.param('specId')
    const sessionId = c.req.param('sessionId')
    if (!specId || !sessionId) return c.notFound()
    const specs = await getSpecs(specId, branch)
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    const pageIndex = Number(c.req.param('pageIndex'))
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const prefix = formPathPrefix(specs.dataSpec.id, branch)
    const prev = findPrevPage(resolved, pageIndex, session.fields)
    const prevUrl =
      prev !== null
        ? resolveUrl(`${prefix}/sessions/${session.id}/pages/${prev}`)
        : null
    return c.html(
      <Layout
        user={user}
        title={resolved.pages[pageIndex].page.title}
        currentPath="/forms"
      >
        {previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)}
        <FormPageView
          page={{
            title: resolved.pages[pageIndex].page.title,
            description: resolved.pages[pageIndex].page.description,
            groups: filterVisibleGroups(
              resolved.pages[pageIndex].groups,
              session.fields,
            ),
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
    const branch = readBranch(c)
    const specId = c.req.param('specId')
    const sessionId = c.req.param('sessionId')
    if (!specId || !sessionId) return c.notFound()
    const specs = await getSpecs(specId, branch)
    if (!specs) return c.notFound()
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

    const prefix = formPathPrefix(specs.dataSpec.id, branch)

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
    const branch = readBranch(c)
    const specId = c.req.param('specId')
    const sessionId = c.req.param('sessionId')
    if (!specId || !sessionId) return c.notFound()
    const specs = await getSpecs(specId, branch)
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    const prefix = formPathPrefix(specs.dataSpec.id, branch)
    return c.html(
      <Layout user={user} title="Review" currentPath="/forms">
        {previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)}
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
    const branch = readBranch(c)
    const specId = c.req.param('specId')
    const sessionId = c.req.param('sessionId')
    if (!specId || !sessionId) return c.notFound()
    const specs = await getSpecs(specId, branch)
    if (!specs) return c.notFound()
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
    const prefix = formPathPrefix(specs.dataSpec.id, branch)
    return c.redirect(
      resolveUrl(
        `${prefix}/sessions/${session.id}/confirmation?submissionId=${submission.id}`,
      ),
    )
  }

  async function handleConfirmation(c: Context) {
    const branch = readBranch(c)
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const submissionId = c.req.query('submissionId')
    if (!submissionId) return c.notFound()
    const submission = submissionGateway.getSubmission(submissionId)
    if (!submission) return c.notFound()
    if (submission.ownerId !== user.login) return c.notFound()
    const specs = await getSpecs(submission.specId, branch)
    return c.html(
      <Layout user={user} title="Confirmation" currentPath="/forms">
        {specs
          ? previewBannerFor(branch, specs.sha, getEditHref, specs.dataSpec.id)
          : null}
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
  }

  // Submission detail (read-only review of completed form)
  forms.get('/sessions/:sessionId/submission', handleSubmissionDetail)

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
  forms.post('/:specId/sessions/:sessionId/pages/:pageIndex', handleSubmitPage)
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

  return forms
}
