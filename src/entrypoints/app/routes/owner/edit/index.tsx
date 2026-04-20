import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { Layout } from '../../../../../design-system/components/flex-layout'
import {
  type AuthoringStage,
  type CriteriaSet,
  detectAuthoringStage,
  emptyCriteriaSet,
  parseCriteriaSet,
} from '../../../../../services/form-authoring'
import type {
  Command,
  FormShaper,
  ProjectState,
} from '../../../../../services/forms'
import {
  commandSchema,
  composeExplanation,
} from '../../../../../services/forms'
import type { ProjectService } from '../../../../../services/projects'
import { loadPolicyCorpus } from '../../../../../services/rag'
import {
  resolveShapingBadgeFromLog,
  type VariantPreferencesService,
} from '../../../../../services/variant-preferences'
import { resolveUrl } from '../../../../../shared/base-path'
import { AppError, UnauthenticatedError } from '../../../../../shared/errors'
import type { StrategyRegistry } from '../../../../../shared/strategy-registry'
import { ErrorPage } from '../components'
import { createAuthoringRoutes } from './authoring'
import { EditorPage, PreviewPage } from './components'

export function createEditRoutes(
  service: ProjectService,
  shapingRegistry: StrategyRegistry<FormShaper>,
  variantPreferences?: VariantPreferencesService,
): Hono {
  const app = new Hono()

  // Mount authoring routes
  const authoringRoutes = createAuthoringRoutes(service, variantPreferences)
  app.route('/', authoringRoutes)

  // GET /:owner/:slug/edit — redirect to a working branch, or show the
  // "no branch yet" shell when only main exists.
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
      const branches = await service.listBranches(slug)
      return c.html(
        <Layout user={user} title={`Edit ${view.project.name}`}>
          <EditorPage
            mode="no-branch"
            view={view}
            owner={owner}
            user={user}
            branches={branches}
          />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // GET /:owner/:slug/edit/:branch — full editor scoped to a branch
  app.get('/:owner/:slug/edit/:branch', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const view = await service.getProject(owner, slug, user, branch)
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
      const log = await service.getShapingLog(owner, slug, branch)
      const branches = await service.listBranches(slug)
      const changed = await service.getChangedResources(slug, branch)

      // Derive shaping badge from the most recent LLM entry with provenance.
      const shapingBadge = resolveShapingBadgeFromLog(log, shapingRegistry)

      // Detect authoring stage for RAG authoring pipeline projects
      let authoringStage: AuthoringStage | null = null
      let authoringCriteria: CriteriaSet | null = null
      let authoringCorpus: Array<{
        source: string
        title: string
        text: string
      }> | null = null
      try {
        const critBuf = await service.getFileContent(
          owner,
          slug,
          branch,
          'forms/default/criteria.json',
        )
        authoringCriteria = critBuf
          ? parseCriteriaSet(critBuf.toString())
          : emptyCriteriaSet()
        const hasPages = (view.formSpec?.pages?.length ?? 0) > 0
        const uncoveredGroupCount = view.spec
          ? view.spec.groups.filter((g) => g.requirements.length === 0).length
          : 0
        authoringStage = detectAuthoringStage({
          hasCriteria: authoringCriteria.criteria.length > 0,
          criteriaApproved: authoringCriteria.approvedAt !== null,
          hasPages,
          uncoveredGroupCount,
        })
        const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })
        authoringCorpus = corpus.map((c) => ({
          source: c.source,
          title: c.title,
          text: c.text,
        }))
      } catch {
        // Not an authoring project — no stage indicator shown
      }

      return c.html(
        <Layout
          user={user}
          title={`Edit ${view.project.name}`}
          contentWidth="full"
        >
          <EditorPage
            mode="editing"
            view={view}
            owner={owner}
            user={user}
            log={log}
            branch={branch}
            branches={branches}
            changed={changed}
            shapingBadge={shapingBadge}
            authoringStage={authoringStage}
            authoringCriteria={authoringCriteria}
            authoringCorpus={authoringCorpus}
          />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // POST /:owner/:slug/edit/:branch/branch — create a new branch and redirect
  // onto it. The `:branch` segment is a contextual URL (typically `main` on
  // the no-branch shell); the new branch name comes from the form body.
  app.post('/:owner/:slug/edit/:branch/branch', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = await c.req.parseBody()
      const name = String(body.name ?? '').trim()
      const startPoint = String(body.startPoint ?? 'main')
      if (!name) {
        throw new AppError('Branch name is required', 400)
      }
      await service.createBranch(slug, name, startPoint, user)
      return c.redirect(resolveUrl(`/${owner}/${slug}/edit/${name}`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  // POST /:owner/:slug/edit/:branch/intent — LLM shapes intent; returns JSON
  app.post('/:owner/:slug/edit/:branch/intent', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      if (branch === 'main') {
        return c.json({ error: 'main is read-only' }, 403)
      }
      const body = (await c.req.json()) as {
        intent: string
        previousAttempt?: { commands: Command[]; feedback: string }
      }
      const view = await service.getProject(owner, slug, user, branch)
      if (!view.isOwner || !view.formSpec || !view.spec) {
        return c.json({ error: 'not allowed' }, 403)
      }

      const state: ProjectState = {
        formSpec: view.formSpec as unknown as ProjectState['formSpec'],
        dataSpec: view.spec as unknown as ProjectState['dataSpec'],
      }

      // Resolve variant per-user preference, falling back to registry default
      const variantId =
        (user && variantPreferences?.get(user.login, 'shaping')) ??
        shapingRegistry.getDefaultId()
      const shaper = shapingRegistry.get(variantId)
      const variantMeta = shapingRegistry.list().find((v) => v.id === variantId)
      const result = await shaper.shape({
        intent: body.intent,
        state,
        previousAttempt: body.previousAttempt,
      })

      return c.json({
        commands: result.commands,
        explanation: result.explanation,
        variantId,
        modelId: variantMeta?.metadata.modelId,
      })
    } catch (err) {
      console.error('[edit/intent]', err)
      return c.json(
        { error: err instanceof Error ? err.message : String(err) },
        500,
      )
    }
  })

  // POST /:owner/:slug/edit/:branch/undo — revert to previous commit
  app.post('/:owner/:slug/edit/:branch/undo', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      if (branch === 'main') {
        return c.json({ error: 'main is read-only' }, 403)
      }
      const body = (await c.req.parseBody()) as { targetSha?: string }
      if (!body.targetSha) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit/${branch}`))
      }
      await service.undoFormSpec(owner, slug, body.targetSha, user)
      return c.redirect(resolveUrl(`/${owner}/${slug}/edit/${branch}`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  // POST /:owner/:slug/edit/:branch/save — commit a staged batch against a
  // branch. Stale-check via parentSha prevents lost writes when concurrent
  // edits advance the branch tip.
  app.post('/:owner/:slug/edit/:branch/save', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      if (branch === 'main') {
        return c.json({ error: 'main is read-only' }, 403)
      }
      const body = (await c.req.json()) as {
        commands: unknown[]
        parentSha: string
        summary?: string
        source: 'manual' | 'llm'
        variantId?: string
        modelId?: string
      }
      const view = await service.getProject(owner, slug, user, branch)
      if (!view.isOwner || !view.formSpec || !view.spec) {
        return c.json({ error: 'not allowed' }, 403)
      }
      // Note: view.currentSha is the main branch tip, not the working branch.
      // For the stale check, skip it when parentSha is provided and trust the
      // sequential save flow from the pipeline panel. The underlying git commit
      // will fail with a merge conflict if there's a genuine concurrent edit.

      const commands = body.commands.map((cmd) => commandSchema.parse(cmd))
      const explanation = composeExplanation(
        commands,
        body.summary,
        view.formSpec as unknown as ProjectState['formSpec'],
        view.spec as unknown as ProjectState['dataSpec'],
      )
      const result = await service.executeCommands(
        owner,
        slug,
        commands,
        explanation,
        body.source,
        user,
        { branch, variantId: body.variantId, modelId: body.modelId },
      )
      if (!result.ok) {
        return c.json(
          {
            error: result.error,
            failedAt: result.failedAt,
            command: result.command,
          },
          400,
        )
      }
      return c.json({ state: result.state, sha: result.sha })
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : String(err) },
        500,
      )
    }
  })

  // GET /:owner/:slug/preview/:branch — render a page as Carlos would see it,
  // scoped to a specific branch.
  app.get('/:owner/:slug/preview/:branch', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const pageIndex = Number(c.req.query('page') ?? 0)
    try {
      const view = await service.getProject(owner, slug, c.get('user'), branch)
      if (!view.formSpec || !view.spec) {
        return c.html(<p>No form spec available.</p>)
      }
      return c.html(<PreviewPage view={view} pageIndex={pageIndex} />)
    } catch (err) {
      return handleError(c, err)
    }
  })

  // GET /:owner/:slug/preview — preview the main branch (read-only baseline)
  app.get('/:owner/:slug/preview', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const pageIndex = Number(c.req.query('page') ?? 0)
    try {
      const view = await service.getProject(owner, slug, c.get('user'))
      if (!view.formSpec || !view.spec) {
        return c.html(<p>No form spec available.</p>)
      }
      return c.html(<PreviewPage view={view} pageIndex={pageIndex} />)
    } catch (err) {
      return handleError(c, err)
    }
  })

  return app
}

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
