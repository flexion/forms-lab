import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { Layout } from '../../../../../design-system/components/flex-layout'
import { AppError, UnauthenticatedError } from '../../../../../services/errors'
import type { FormShaper } from '../../../../../services/forms/shaping/types'
import type {
  DeliveryMode,
  FormSpec,
} from '../../../../../services/forms/types'
import type { ProjectService } from '../../../../../services/project-service'
import type { StrategyRegistry } from '../../../../../services/strategy-registry'
import { resolveUrl } from '../../../../../shared/base-path'
import { ErrorPage } from '../components'
import { EditorPage, PreviewPage } from './components'

export function createEditRoutes(
  service: ProjectService,
  _shapingRegistry: StrategyRegistry<FormShaper>,
): Hono {
  const app = new Hono()

  // -----------------------------------------------------------------------
  // GET /:owner/:slug/edit — render editor
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/edit', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) throw new UnauthenticatedError()
      const view = await service.getProject(owner, slug, user)

      if (!view.isOwner) {
        return c.html(
          <Layout user={user}>
            <ErrorPage
              statusCode={403}
              message="Only the project owner can edit the form."
            />
          </Layout>,
          403,
        )
      }

      const history = await service.getFormSpecHistory(owner, slug)

      return c.html(
        <Layout user={user} title={`Edit ${view.project.name}`}>
          <EditorPage view={view} owner={owner} user={user} history={history} />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // POST /:owner/:slug/edit/intent — send intent to LLM, return diff
  // -----------------------------------------------------------------------
  app.post('/:owner/:slug/edit/intent', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    console.log(`[edit/intent] ${owner}/${slug} user=${user?.login ?? 'none'}`)

    try {
      if (!user) throw new UnauthenticatedError()

      const body = await c.req.parseBody()
      const intent = (body.intent as string) ?? ''
      console.log(`[edit/intent] intent="${intent}"`)

      if (!intent.trim()) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }

      const view = await service.getProject(owner, slug, user)
      if (!view.isOwner) {
        return c.html(
          <Layout user={user}>
            <ErrorPage statusCode={403} message="Permission denied" />
          </Layout>,
          403,
        )
      }

      if (!view.formSpec || !view.spec) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }

      // TODO(Task 13): rewrite to use command-based shaping. This route is
      // temporarily stubbed out while the shaper interface is being rewritten.
      const history = await service.getFormSpecHistory(owner, slug)
      return c.html(
        <Layout user={user} title={`Edit ${view.project.name}`}>
          <EditorPage
            view={view}
            owner={owner}
            user={user}
            history={history}
            error="Intent-based shaping is being rebuilt. Please check back soon."
          />
        </Layout>,
      )
    } catch (err) {
      console.error(
        `[edit/intent] ERROR:`,
        err instanceof Error ? (err.stack ?? err.message) : String(err),
      )
      if (err instanceof AppError || err instanceof UnauthenticatedError) {
        return handleError(c, err)
      }
      // LLM errors — show inline (user is non-null here, checked above)
      const currentUser = user as NonNullable<typeof user>
      const view = await service.getProject(owner, slug, currentUser)
      const history = await service.getFormSpecHistory(owner, slug)
      return c.html(
        <Layout user={currentUser} title={`Edit ${view.project.name}`}>
          <EditorPage
            view={view}
            owner={owner}
            user={currentUser}
            history={history}
            error={`Shaping failed: ${err instanceof Error ? err.message : String(err)}`}
          />
        </Layout>,
      )
    }
  })

  // -----------------------------------------------------------------------
  // POST /:owner/:slug/edit/accept — commit proposed changes
  // -----------------------------------------------------------------------
  app.post('/:owner/:slug/edit/accept', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) throw new UnauthenticatedError()

      const body = await c.req.parseBody()
      const proposedSpecJson = body.proposedSpec as string
      if (!proposedSpecJson) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }

      const proposedSpec = JSON.parse(proposedSpecJson) as FormSpec
      await service.updateFormSpec(
        owner,
        slug,
        toModelsFormSpec(proposedSpec),
        'Apply AI-suggested form changes',
        user,
      )

      return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // POST /:owner/:slug/edit/reject — discard proposed changes
  // -----------------------------------------------------------------------
  app.post('/:owner/:slug/edit/reject', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
  })

  // -----------------------------------------------------------------------
  // POST /:owner/:slug/edit/reorder — move page up/down or reorder all
  // -----------------------------------------------------------------------
  app.post('/:owner/:slug/edit/reorder', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) throw new UnauthenticatedError()

      const body = await c.req.parseBody()
      const view = await service.getProject(owner, slug, user)
      if (!view.isOwner || !view.formSpec) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }

      let pages = [...view.formSpec.pages]
      let commitMessage = 'Reorder pages'

      // Check if this is a full order array (drag-and-drop) or single move (fallback)
      if (body.order) {
        // Drag-and-drop: full order array
        const orderJson = body.order as string
        const pageIds = JSON.parse(orderJson) as string[]

        // Reorder pages based on the provided array
        const pageMap = new Map(pages.map((p) => [p.id, p]))
        pages = pageIds
          .map((id) => pageMap.get(id))
          .filter(Boolean) as typeof pages

        commitMessage = 'Reorder pages via drag-and-drop'
      } else if (body.pageId && body.direction) {
        // Fallback: single up/down move
        const pageId = body.pageId as string
        const direction = body.direction as string

        const idx = pages.findIndex((p) => p.id === pageId)
        if (idx === -1) {
          return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
        }

        const newIdx = direction === 'up' ? idx - 1 : idx + 1
        if (newIdx < 0 || newIdx >= pages.length) {
          return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
        }

        // Swap
        const temp = pages[idx]
        pages[idx] = pages[newIdx]
        pages[newIdx] = temp

        commitMessage = `Reorder: move "${pages[newIdx].title}" ${direction}`
      } else {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }

      const updatedSpec = { ...view.formSpec, pages }
      await service.updateFormSpec(
        owner,
        slug,
        updatedSpec,
        commitMessage,
        user,
      )

      return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // POST /:owner/:slug/edit/delivery-mode — change page delivery mode
  // -----------------------------------------------------------------------
  app.post('/:owner/:slug/edit/delivery-mode', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) throw new UnauthenticatedError()

      const body = await c.req.parseBody()
      const pageId = body.pageId as string
      const deliveryMode = body.deliveryMode as DeliveryMode

      if (!['static', 'conversational', 'hybrid'].includes(deliveryMode)) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }

      const view = await service.getProject(owner, slug, user)
      if (!view.isOwner || !view.formSpec) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }

      const pages = view.formSpec.pages.map((p) =>
        p.id === pageId ? { ...p, deliveryMode } : p,
      )

      const updatedSpec = { ...view.formSpec, pages }
      await service.updateFormSpec(
        owner,
        slug,
        updatedSpec,
        `Set delivery mode for "${pages.find((p) => p.id === pageId)?.title ?? pageId}" to ${deliveryMode}`,
        user,
      )

      return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // POST /:owner/:slug/edit/undo — revert to previous version
  // -----------------------------------------------------------------------
  app.post('/:owner/:slug/edit/undo', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) throw new UnauthenticatedError()

      const body = await c.req.parseBody()
      const targetSha = body.targetSha as string

      if (!targetSha) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }

      await service.undoFormSpec(owner, slug, targetSha, user)
      return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // GET /:owner/:slug/edit/history — form spec history (JSON)
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/edit/history', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')

    try {
      const history = await service.getFormSpecHistory(owner, slug)
      return c.json(history)
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // GET /:owner/:slug/edit/suggest-modes — LLM delivery mode suggestions
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/edit/suggest-modes', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) throw new UnauthenticatedError()

      const view = await service.getProject(owner, slug, user)
      if (!view.formSpec || !view.spec) {
        return c.json({ error: 'No form spec available' }, 400)
      }

      // TODO(Task 13): wire suggest-modes to command-based shaping
      return c.json({
        message:
          'Delivery mode suggestions will be available when the suggest-modes strategy is wired.',
      })
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // GET /:owner/:slug/preview — render form preview
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/preview', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      const view = await service.getProject(owner, slug, user)

      if (!view.formSpec || !view.spec) {
        return c.html(
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <title>Preview</title>
            </head>
            <body>
              <p>No form specification available for preview.</p>
            </body>
          </html>,
        )
      }

      return c.html(
        <PreviewPage
          formSpec={toServicesFormSpec(view.formSpec)}
          spec={view.spec}
        />,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  return app
}

// ---------------------------------------------------------------------------
// Type adapters between models.ts FormSpec and services/forms/types FormSpec
// ---------------------------------------------------------------------------

/**
 * The ProjectView returns FormSpec from types/models.ts (deliveryMode required,
 * has createdAt/updatedAt). The shaping layer uses FormSpec from
 * services/forms/types.ts (deliveryMode optional, no timestamps).
 * These helpers bridge the gap.
 */
function toServicesFormSpec(
  modelSpec: import('../../../../../types/models').FormSpec,
): FormSpec {
  return {
    id: modelSpec.id,
    specId: modelSpec.specId,
    title: modelSpec.title,
    pages: modelSpec.pages.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      groups: p.groups,
      deliveryMode: p.deliveryMode,
    })),
  }
}

function toModelsFormSpec(
  serviceSpec: FormSpec,
): import('../../../../../types/models').FormSpec {
  return {
    id: serviceSpec.id,
    specId: serviceSpec.specId,
    title: serviceSpec.title,
    pages: serviceSpec.pages.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      groups: p.groups,
      deliveryMode: p.deliveryMode ?? 'static',
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// TODO(Task 13): restore when edit routes are rewritten for command-based shaping
// function toServicesDataSpec(
//   modelSpec: import('../../../../../types/models').DataCollectionSpec,
// ): import('../../../../../services/data-collection/types').DataCollectionSpec {
//   return modelSpec as unknown as import('../../../../../services/data-collection/types').DataCollectionSpec
// }

// ---------------------------------------------------------------------------
// Error handler (shared pattern with owner routes)
// ---------------------------------------------------------------------------

function handleError(c: Context, err: unknown) {
  if (err instanceof UnauthenticatedError) {
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
