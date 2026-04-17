import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { Layout } from '../../../../../design-system/components/flex-layout'
import { AppError, UnauthenticatedError } from '../../../../../services/errors'
import type {
  Command,
  ProjectState,
} from '../../../../../services/forms/shaping/commands'
import { commandSchema } from '../../../../../services/forms/shaping/commands'
import { executeBatch } from '../../../../../services/forms/shaping/executor'
import { humanize } from '../../../../../services/forms/shaping/humanize'
import type { FormShaper } from '../../../../../services/forms/shaping/types'
import type { ProjectService } from '../../../../../services/project-service'
import type { StrategyRegistry } from '../../../../../services/strategy-registry'
import { resolveUrl } from '../../../../../shared/base-path'
import { ErrorPage } from '../components'
import { EditorPage, PreviewPage } from './components'

export function createEditRoutes(
  service: ProjectService,
  shapingRegistry: StrategyRegistry<FormShaper>,
): Hono {
  const app = new Hono()

  // GET /:owner/:slug/edit — render editor shell (server-rendered HTML)
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
      const log = await service.getShapingLog(owner, slug)
      return c.html(
        <Layout
          user={user}
          title={`Edit ${view.project.name}`}
          contentWidth="full"
        >
          <EditorPage view={view} owner={owner} user={user} log={log} />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // POST /:owner/:slug/edit/intent — LLM shapes intent; returns JSON
  app.post('/:owner/:slug/edit/intent', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.json()) as {
        intent: string
        previousAttempt?: { commands: Command[]; feedback: string }
      }
      const view = await service.getProject(owner, slug, user)
      if (!view.isOwner || !view.formSpec || !view.spec) {
        return c.json({ error: 'not allowed' }, 403)
      }

      const state: ProjectState = {
        formSpec: view.formSpec as unknown as ProjectState['formSpec'],
        dataSpec: view.spec as unknown as ProjectState['dataSpec'],
      }

      const shaper = shapingRegistry.getDefault()
      const result = await shaper.shape({
        intent: body.intent,
        state,
        previousAttempt: body.previousAttempt,
      })

      return c.json({
        commands: result.commands,
        explanation: result.explanation,
      })
    } catch (err) {
      console.error('[edit/intent]', err)
      return c.json(
        { error: err instanceof Error ? err.message : String(err) },
        500,
      )
    }
  })

  // POST /:owner/:slug/edit/accept — execute a command batch
  app.post('/:owner/:slug/edit/accept', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.json()) as {
        commands: unknown[]
        explanation: string
        source: 'llm' | 'manual'
      }
      const commands = body.commands.map((cmd) => commandSchema.parse(cmd))
      const result = await service.executeCommands(
        owner,
        slug,
        commands,
        body.explanation,
        body.source,
        user,
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

  // POST /:owner/:slug/edit/execute — execute a single command (manual ops)
  app.post('/:owner/:slug/edit/execute', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.json()) as {
        command: unknown
        explanation: string
      }
      const command = commandSchema.parse(body.command)
      const result = await service.executeCommands(
        owner,
        slug,
        [command],
        body.explanation,
        'manual',
        user,
      )
      if (!result.ok) {
        return c.json({ error: result.error }, 400)
      }
      return c.json({ state: result.state, sha: result.sha })
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : String(err) },
        500,
      )
    }
  })

  // POST /:owner/:slug/edit/undo — revert to previous commit
  app.post('/:owner/:slug/edit/undo', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.parseBody()) as { targetSha?: string }
      if (!body.targetSha) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }
      await service.undoFormSpec(owner, slug, body.targetSha, user)
      return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  // POST /:owner/:slug/edit/save — commit a staged batch
  app.post('/:owner/:slug/edit/save', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.json()) as {
        commands: unknown[]
        parentSha: string
        summary?: string
        source: 'manual' | 'llm'
      }
      const view = await service.getProject(owner, slug, user)
      if (view.currentSha !== body.parentSha) {
        return c.json({ error: 'stale', currentSha: view.currentSha }, 409)
      }
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
      )
      if (!result.ok) {
        return c.json(
          { error: result.error, failedAt: result.failedAt, command: result.command },
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

  // GET /:owner/:slug/preview — render a page as Carlos would see it
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

function composeExplanation(
  commands: Command[],
  summary: string | undefined,
  formSpec: ProjectState['formSpec'],
  dataSpec: ProjectState['dataSpec'],
): string {
  let state: ProjectState = { formSpec, dataSpec }
  const lines: string[] = []
  for (const command of commands) {
    lines.push(`- ${humanize(command, state)}`)
    const next = executeBatch(state, [command])
    if (next.ok) state = next.state
  }
  if (summary) return [summary, '', ...lines].join('\n')
  return lines.join('\n')
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
