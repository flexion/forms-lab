import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { PDFDocument } from 'pdf-lib'
import { createFormRouter } from '../../src/entrypoints/app/routes/forms/index'
import type { FieldMapping } from '../../src/services/form-documents'
import { InMemoryFormSessionGateway } from '../../src/services/forms/session'
import { InMemorySubmissionGateway } from '../../src/services/forms/submission'
import { testDataSpec, testFormSpec } from './fixtures'

const TEST_SHA = 'abc1234567890def1234567890abc1234567890'

const TEST_USER = {
  login: 'testuser',
  name: 'Test User',
  avatarUrl: '',
}

const specs = {
  dataSpec: testDataSpec,
  formSpec: testFormSpec,
  sha: TEST_SHA,
}

const BASE = '/alice/test-project/forms'

async function createTestPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.addPage()
  const form = doc.getForm()
  form.createTextField('Full Name')
  form.createTextField('Email Address')
  const bytes = await doc.save()
  return Buffer.from(bytes)
}

const testFieldMapping: FieldMapping = {
  fullName: 'Full Name',
  email: 'Email Address',
}

function createTestApp(opts?: {
  sourcePdf?: Buffer
  fieldMapping?: FieldMapping
}) {
  const sourcePdf = opts?.sourcePdf
  const fieldMapping = opts?.fieldMapping
  const sessionGateway = new InMemoryFormSessionGateway()
  const submissionGateway = new InMemorySubmissionGateway()
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', TEST_USER)
    await next()
  })
  app.route(
    '/:owner/:slug/forms',
    createFormRouter({
      sessionGateway,
      submissionGateway,
      getSpecs: async () => specs,
      listSpecs: async () => [specs],
      resolveOwnerSlug: (c) => ({
        owner: c.req.param('owner') ?? '',
        slug: c.req.param('slug') ?? '',
      }),
      getSpecsByProject: async () => specs,
      getSourcePdf: sourcePdf ? async () => sourcePdf : undefined,
      getFieldMapping: fieldMapping ? async () => fieldMapping : undefined,
    }),
  )
  return { app, sessionGateway, submissionGateway }
}

describe('PDF download route', () => {
  it('returns a filled PDF for a valid submission', async () => {
    const sourcePdf = await createTestPdf()
    const { app, sessionGateway, submissionGateway } = createTestApp({
      sourcePdf,
      fieldMapping: testFieldMapping,
    })

    const session = sessionGateway.createSession(
      testDataSpec.id,
      testFormSpec.id,
      TEST_USER.login,
      TEST_SHA,
    )
    sessionGateway.writeFields(session.id, {
      fullName: { value: 'Jane Doe' },
      email: { value: 'jane@example.com' },
    })
    const submission = sessionGateway.submit(session.id)
    submissionGateway.save(submission)

    const res = await app.request(`${BASE}/submissions/${submission.id}/pdf`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('attachment')

    const pdfBytes = await res.arrayBuffer()
    const doc = await PDFDocument.load(pdfBytes)
    const form = doc.getForm()
    expect(form.getTextField('Full Name').getText()).toBe('Jane Doe')
    expect(form.getTextField('Email Address').getText()).toBe(
      'jane@example.com',
    )
  })

  it('returns 404 when submission does not exist', async () => {
    const { app } = createTestApp()
    const res = await app.request(`${BASE}/submissions/nonexistent/pdf`)
    expect(res.status).toBe(404)
  })

  it('returns 404 when user does not own submission', async () => {
    const sourcePdf = await createTestPdf()
    const { app, sessionGateway, submissionGateway } = createTestApp({
      sourcePdf,
      fieldMapping: testFieldMapping,
    })

    const session = sessionGateway.createSession(
      testDataSpec.id,
      testFormSpec.id,
      'other-user',
      TEST_SHA,
    )
    sessionGateway.writeFields(session.id, {
      fullName: { value: 'Other' },
    })
    const submission = sessionGateway.submit(session.id)
    submissionGateway.save(submission)

    const res = await app.request(`${BASE}/submissions/${submission.id}/pdf`)
    expect(res.status).toBe(404)
  })

  it('returns 404 when source PDF is not available', async () => {
    const { app, sessionGateway, submissionGateway } = createTestApp({
      fieldMapping: testFieldMapping,
    })

    const session = sessionGateway.createSession(
      testDataSpec.id,
      testFormSpec.id,
      TEST_USER.login,
      TEST_SHA,
    )
    sessionGateway.writeFields(session.id, {
      fullName: { value: 'Jane' },
    })
    const submission = sessionGateway.submit(session.id)
    submissionGateway.save(submission)

    const res = await app.request(`${BASE}/submissions/${submission.id}/pdf`)
    expect(res.status).toBe(404)
  })
})
