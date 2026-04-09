import { Hono } from 'hono'
import { Layout } from '../../components/flex-layout'
import { FormLanding } from '../../components/flex-form-landing'
import { FormPageView } from '../../components/flex-form-page'
import { FormReview } from '../../components/flex-form-review'
import { FormConfirmation } from '../../components/flex-form-confirmation'
import { resolveFormSpec } from '../../services/form-resolver'
import { validateFields } from '../../services/form-validation'
import { findNextPage, findPrevPage } from '../../services/form-navigation'
import type {
  DataCollectionSpec,
  FieldEntry,
  FormSpec,
  FormSessionGateway,
  SubmissionGateway,
} from '../../types/models'

interface FormRouterDeps {
  sessionGateway: FormSessionGateway
  submissionGateway: SubmissionGateway
  getSpecs: (specId: string) => { dataSpec: DataCollectionSpec; formSpec: FormSpec } | null
}

export function createFormRouter(deps: FormRouterDeps) {
  const { sessionGateway, submissionGateway, getSpecs } = deps
  const forms = new Hono()

  // Landing page
  forms.get('/:specId', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    return c.html(
      <Layout title={specs.formSpec.title} currentPath="/forms">
        <FormLanding
          formSpec={specs.formSpec}
          startUrl={`/forms/${specs.dataSpec.id}/sessions`}
        />
      </Layout>,
    )
  })

  // Create session
  forms.post('/:specId/sessions', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.createSession(specs.dataSpec.id, specs.formSpec.id)
    return c.redirect(`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/0`)
  })

  // Render page
  forms.get('/:specId/sessions/:sessionId/pages/:pageIndex', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    const pageIndex = Number(c.req.param('pageIndex'))
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const prev = findPrevPage(resolved, pageIndex, session.fields)
    const prevUrl = prev !== null
      ? `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${prev}`
      : null
    return c.html(
      <Layout title={resolved.pages[pageIndex].page.title} currentPath="/forms">
        <FormPageView
          resolvedPage={resolved.pages[pageIndex]}
          pageIndex={pageIndex}
          actionUrl={`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${pageIndex}`}
          fields={session.fields}
          prevUrl={prevUrl}
        />
      </Layout>,
    )
  })

  // Submit page (validate and advance)
  forms.post('/:specId/sessions/:sessionId/pages/:pageIndex', async (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
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
    const hasErrors = Object.values(validated).some((e) => e.errors && e.errors.length > 0)

    if (hasErrors) {
      const mergedFields = { ...session.fields, ...validated }
      const prev = findPrevPage(resolved, pageIndex, mergedFields)
      const prevUrl = prev !== null
        ? `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${prev}`
        : null
      return c.html(
        <Layout title={resolvedPage.page.title} currentPath="/forms">
          <FormPageView
            resolvedPage={resolvedPage}
            pageIndex={pageIndex}
            actionUrl={`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${pageIndex}`}
            fields={mergedFields}
            prevUrl={prevUrl}
          />
        </Layout>,
      )
    }

    sessionGateway.writeFields(session.id, validated)
    const updatedSession = sessionGateway.getSession(session.id)!
    const next = findNextPage(resolved, pageIndex, updatedSession.fields)
    if (next !== null) {
      return c.redirect(`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${next}`)
    }
    return c.redirect(`/forms/${specs.dataSpec.id}/sessions/${session.id}/review`)
  })

  // Review page
  forms.get('/:specId/sessions/:sessionId/review', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    return c.html(
      <Layout title="Review" currentPath="/forms">
        <FormReview
          resolved={resolved}
          fields={session.fields}
          submitUrl={`/forms/${specs.dataSpec.id}/sessions/${session.id}/submit`}
          editBaseUrl={`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages`}
        />
      </Layout>,
    )
  })

  // Submit
  forms.post('/:specId/sessions/:sessionId/submit', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    const submission = sessionGateway.submit(session.id)
    submissionGateway.save(submission)
    return c.redirect(
      `/forms/${specs.dataSpec.id}/sessions/${session.id}/confirmation?submissionId=${submission.id}`,
    )
  })

  // Confirmation
  forms.get('/:specId/sessions/:sessionId/confirmation', (c) => {
    const submissionId = c.req.query('submissionId')
    if (!submissionId) return c.notFound()
    const submission = submissionGateway.getSubmission(submissionId)
    if (!submission) return c.notFound()
    return c.html(
      <Layout title="Confirmation" currentPath="/forms">
        <FormConfirmation submission={submission} />
      </Layout>,
    )
  })

  return forms
}
