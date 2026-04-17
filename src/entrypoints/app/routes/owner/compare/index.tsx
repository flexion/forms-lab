import { Hono } from 'hono'
import { Layout } from '../../../../../design-system/components/flex-layout'
import { compareSpecs } from '../../../../../services/forms/comparison'
import { buildFormPreview } from '../../../../../services/forms/preview'
import type { ReviewService } from '../../../../../services/forms/review'
import type { ProjectService } from '../../../../../services/project-service'
import { resolveUrl } from '../../../../../shared/base-path'
import { ReviewPage } from './components'

function parseRange(range: string): { base: string; head: string } | null {
  const idx = range.indexOf('...')
  if (idx < 0) return null
  const base = range.slice(0, idx)
  const head = range.slice(idx + 3)
  if (!base || !head) return null
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
      <Layout
        user={user}
        title={`Compare ${parsed.base}...${parsed.head}`}
        contentWidth="full"
      >
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
  })

  app.post('/:owner/:slug/compare/:range/close', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    await review.close({
      owner,
      slug,
      base: parsed.base,
      head: parsed.head,
    })
    return c.redirect(resolveUrl(`/${owner}/${slug}`))
  })

  app.post('/:owner/:slug/compare/:range/comments', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    const user = c.get('user')
    if (!user) return c.text('authentication required', 401)
    const body = await c.req.parseBody()
    await review.comments.add(
      { owner, slug, base: parsed.base, head: parsed.head },
      {
        body: String(body.body ?? ''),
        author: user.login,
        parentId: body.parentId ? String(body.parentId) : undefined,
      },
    )
    return c.redirect(resolveUrl(`/${owner}/${slug}/compare/${range}#comments`))
  })

  return app
}
