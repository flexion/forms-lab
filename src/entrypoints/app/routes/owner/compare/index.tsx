import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { Layout } from '../../../../../design-system/components/flex-layout'
import {
  AppError,
  ForbiddenError,
  UnauthenticatedError,
} from '../../../../../services/errors'
import { compareSpecs } from '../../../../../services/forms/comparison'
import { buildFormPreview } from '../../../../../services/forms/preview'
import type { ReviewService } from '../../../../../services/forms/review'
import type { ProjectService } from '../../../../../services/project-service'
import { resolveUrl } from '../../../../../shared/base-path'
import { ErrorPage } from '../components'
import { ReviewPage } from './components'

function parseRange(range: string): { base: string; head: string } | null {
  const idx = range.indexOf('...')
  if (idx < 0) return null
  const base = range.slice(0, idx)
  const head = range.slice(idx + 3)
  if (!base || !head) return null
  // Reject refs that start with '.' — prevents traversal-like inputs
  // (e.g. '...', '..foo') from being accepted as valid git refs.
  if (base.startsWith('.') || head.startsWith('.')) return null
  return { base, head }
}

export function createCompareRoutes(
  project: ProjectService,
  review: ReviewService,
): Hono {
  const app = new Hono()

  app.get('/:owner/:slug/compare/:range', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    const user = c.get('user')

    const baseView = await project.getProject(owner, slug, user, parsed.base)
    const headView = await project.getProject(owner, slug, user, parsed.head)

    // Guard: if either view is missing specs, we can't diff
    if (
      !baseView.spec ||
      !baseView.formSpec ||
      !headView.spec ||
      !headView.formSpec
    ) {
      return c.text('Specs not available for comparison', 400)
    }

    const changes = compareSpecs(
      { dataSpec: baseView.spec, formSpec: baseView.formSpec },
      { dataSpec: headView.spec, formSpec: headView.formSpec },
    )
    const basePreview = buildFormPreview(baseView.spec, baseView.formSpec)
    const headPreview = buildFormPreview(headView.spec, headView.formSpec)
    const comments = await review.comments.list({
      owner,
      slug,
      base: parsed.base,
      head: parsed.head,
    })
    const log = await project.getShapingLogBetween(
      slug,
      parsed.base,
      parsed.head,
    )

    return c.html(
      <Layout user={user} title={`Compare ${parsed.base}...${parsed.head}`}>
        <ReviewPage
          owner={owner}
          slug={slug}
          base={parsed.base}
          head={parsed.head}
          changes={changes}
          comments={comments}
          log={log}
          baseView={baseView}
          headView={headView}
          basePreview={basePreview}
          headPreview={headPreview}
        />
      </Layout>,
    )
  })

  app.post('/:owner/:slug/compare/:range/merge', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      // getProject throws NotFoundError if the project doesn't belong to the
      // owner. Ownership is then enforced via the isOwner flag below.
      const view = await project.getProject(owner, slug, user, parsed.base)
      if (!view.isOwner) throw new ForbiddenError()
      const outcome = await review.merge({
        owner,
        slug,
        base: parsed.base,
        head: parsed.head,
      })
      if (outcome.status === 'merged') {
        return c.redirect(resolveUrl(`/${owner}/${slug}`))
      }
      return c.text(`Cannot merge: ${JSON.stringify(outcome)}`, 409)
    } catch (err) {
      return handleError(c, err)
    }
  })

  app.post('/:owner/:slug/compare/:range/close', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    // Defensive: never allow deleting the main branch via a compare close.
    // Checked before project lookup so a bogus base ref in the URL can't
    // trigger spurious 500s on this guard path.
    if (parsed.head === 'main') {
      return c.text('Cannot close the main branch', 400)
    }
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const view = await project.getProject(owner, slug, user, parsed.base)
      if (!view.isOwner) throw new ForbiddenError()
      await review.close({
        owner,
        slug,
        base: parsed.base,
        head: parsed.head,
      })
      return c.redirect(resolveUrl(`/${owner}/${slug}`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  app.post('/:owner/:slug/compare/:range/comments', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      // Comments are a collaborative affordance: any authenticated user may
      // leave a comment, but we still verify the project exists (and
      // therefore the compare range is meaningful) before recording.
      await project.getProject(owner, slug, user, parsed.base)
      const body = await c.req.parseBody()
      await review.comments.add(
        { owner, slug, base: parsed.base, head: parsed.head },
        {
          body: String(body.body ?? ''),
          author: user.login,
          parentId: body.parentId ? String(body.parentId) : undefined,
        },
      )
      return c.redirect(
        resolveUrl(`/${owner}/${slug}/compare/${range}#comments`),
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  return app
}

function handleError(c: Context, err: unknown) {
  if (err instanceof UnauthenticatedError) {
    // For XHR-ish callers, return JSON 401 so scripts can handle it. For
    // form-style POSTs, redirect to sign-in keeps the experience consistent
    // with the editor.
    const accept = c.req.header('accept') ?? ''
    if (accept.includes('application/json')) {
      return c.json({ error: err.message }, 401)
    }
    return c.redirect(
      resolveUrl(`/auth/signin?returnTo=${encodeURIComponent(c.req.path)}`),
    )
  }
  if (err instanceof AppError) {
    return c.html(
      <Layout user={c.get('user')}>
        <ErrorPage statusCode={err.statusCode} message={err.message} />
      </Layout>,
      err.statusCode as ContentfulStatusCode,
    )
  }
  throw err
}
