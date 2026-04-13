import { Hono } from 'hono'
import { FormConfirmation } from '../../../../design-system/components/flex-form-confirmation'
import type { FormError } from '../../../../design-system/components/flex-form-error-summary'
import { FormLanding } from '../../../../design-system/components/flex-form-landing'
import { FormPageView } from '../../../../design-system/components/flex-form-page'
import { FormReview } from '../../../../design-system/components/flex-form-review'
import { Layout } from '../../../../design-system/components/flex-layout'
import type {
  DataCollectionSpec,
  RequirementGroup,
} from '../../../../services/data-collection/types'
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

interface FormRouterDeps {
  sessionGateway: FormSessionGateway
  submissionGateway: SubmissionGateway
  getSpecs: (
    specId: string,
  ) => { dataSpec: DataCollectionSpec; formSpec: FormSpec } | null
  listSpecs: () => { dataSpec: DataCollectionSpec; formSpec: FormSpec }[]
}

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

export function createFormRouter(deps: FormRouterDeps) {
  const { sessionGateway, submissionGateway, getSpecs, listSpecs } = deps
  const forms = new Hono()

  // Forms index (public)
  forms.get('/', (c) => {
    const allSpecs = listSpecs()
    return c.html(
      <Layout user={c.get('user')} title="Forms" currentPath="/forms">
        <div class="flex-form" data-size="large">
          <h1>Available Forms</h1>
          {allSpecs.length === 0 ? (
            <p>No forms available.</p>
          ) : (
            <ul class="l-stack">
              {allSpecs.map(({ dataSpec, formSpec }) => (
                <li key={dataSpec.id}>
                  <a href={resolveUrl(`/forms/${dataSpec.id}`)}>
                    <strong>{formSpec.title}</strong>
                  </a>
                  {formSpec.description && <p>{formSpec.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Layout>,
    )
  })

  // My sessions (requires auth)
  forms.get('/sessions', requireAuth(), (c) => {
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const sessions = sessionGateway.listByOwner(user.login)
    const active = sessions.filter((s) => s.status === 'active')
    const submitted = sessions.filter((s) => s.status === 'submitted')
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
                      const specs = getSpecs(s.specId)
                      const title = specs?.formSpec.title ?? s.specId
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
                      const specs = getSpecs(s.specId)
                      const title = specs?.formSpec.title ?? s.specId
                      return (
                        <li key={s.id}>
                          <strong>{title}</strong>
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

  // Form landing page (public — viewing a form description is fine)
  forms.get('/:specId', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    return c.html(
      <Layout
        user={c.get('user')}
        title={specs.formSpec.title}
        currentPath="/forms"
      >
        <FormLanding
          formSpec={specs.formSpec}
          startUrl={resolveUrl(`/forms/${specs.dataSpec.id}/sessions`)}
        />
      </Layout>,
    )
  })

  // All session routes require authentication
  forms.use('/:specId/sessions/*', requireAuth())
  forms.post('/:specId/sessions', requireAuth())

  // Create session
  forms.post('/:specId/sessions', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.createSession(
      specs.dataSpec.id,
      specs.formSpec.id,
      user.login,
    )
    return c.redirect(
      resolveUrl(`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/0`),
    )
  })

  // Render page
  forms.get('/:specId/sessions/:sessionId/pages/:pageIndex', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    const pageIndex = Number(c.req.param('pageIndex'))
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const prev = findPrevPage(resolved, pageIndex, session.fields)
    const prevUrl =
      prev !== null
        ? resolveUrl(
            `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${prev}`,
          )
        : null
    return c.html(
      <Layout
        user={user}
        title={resolved.pages[pageIndex].page.title}
        currentPath="/forms"
      >
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
            `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${pageIndex}`,
          )}
          currentPage={visiblePageNumber(resolved, pageIndex, session.fields)}
          totalPages={countVisiblePages(resolved, session.fields)}
          fields={session.fields}
          errors={[]}
          prevUrl={prevUrl}
        />
      </Layout>,
    )
  })

  // Submit page (validate and advance)
  forms.post('/:specId/sessions/:sessionId/pages/:pageIndex', async (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(c.req.param('sessionId'))
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
          ? resolveUrl(
              `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${prev}`,
            )
          : null
      return c.html(
        <Layout
          user={user}
          title={`Error: ${resolvedPage.page.title}`}
          currentPath="/forms"
        >
          <FormPageView
            page={{
              title: resolvedPage.page.title,
              description: resolvedPage.page.description,
              groups: filterVisibleGroups(resolvedPage.groups, mergedFields),
            }}
            actionUrl={resolveUrl(
              `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${pageIndex}`,
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
        resolveUrl(
          `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${next}`,
        ),
      )
    }
    return c.redirect(
      resolveUrl(`/forms/${specs.dataSpec.id}/sessions/${session.id}/review`),
    )
  })

  // Review page
  forms.get('/:specId/sessions/:sessionId/review', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    return c.html(
      <Layout user={user} title="Review" currentPath="/forms">
        <FormReview
          pages={buildReviewPages(resolved, session.fields)}
          fields={session.fields}
          submitUrl={resolveUrl(
            `/forms/${specs.dataSpec.id}/sessions/${session.id}/submit`,
          )}
          editBaseUrl={resolveUrl(
            `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages`,
          )}
        />
      </Layout>,
    )
  })

  // Submit
  forms.post('/:specId/sessions/:sessionId/submit', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    if (session.status === 'submitted') {
      return c.text('This form has already been submitted.', 409)
    }
    const submission = sessionGateway.submit(session.id)
    submissionGateway.save(submission)
    return c.redirect(
      resolveUrl(
        `/forms/${specs.dataSpec.id}/sessions/${session.id}/confirmation?submissionId=${submission.id}`,
      ),
    )
  })

  // Confirmation
  forms.get('/:specId/sessions/:sessionId/confirmation', (c) => {
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const submissionId = c.req.query('submissionId')
    if (!submissionId) return c.notFound()
    const submission = submissionGateway.getSubmission(submissionId)
    if (!submission) return c.notFound()
    if (submission.ownerId !== user.login) return c.notFound()
    return c.html(
      <Layout user={user} title="Confirmation" currentPath="/forms">
        <FormConfirmation submission={submission} />
      </Layout>,
    )
  })

  return forms
}
