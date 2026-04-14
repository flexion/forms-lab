import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { Layout } from '../../../../design-system/components/flex-layout'
import { AppError, UnauthenticatedError } from '../../../../services/errors'
import type { ProjectService } from '../../../../services/project-service'
import type { UserStore } from '../../../../services/user-store'
import { resolveUrl } from '../../../../shared/base-path'
import {
  BlobPage,
  CommitListPage,
  ErrorPage,
  ProfilePage,
  ProjectOverview,
  SettingsPage,
  TreePage,
} from './components'

export function createOwnerRoutes(
  service: ProjectService,
  userStore: UserStore,
): Hono {
  const app = new Hono()

  // -----------------------------------------------------------------------
  // 1. GET /:owner — Profile page
  // -----------------------------------------------------------------------
  app.get('/:owner', async (c) => {
    const owner = c.req.param('owner')
    const profile = userStore.get(owner)
    if (!profile) {
      return c.html(
        <Layout user={c.get('user')}>
          <ErrorPage statusCode={404} message="User not found" />
        </Layout>,
        404,
      )
    }

    const projects = service.listUserProjects(owner)
    return c.html(
      <Layout user={c.get('user')}>
        <ProfilePage
          user={profile}
          projects={projects}
          currentUser={c.get('user')}
        />
      </Layout>,
    )
  })

  // -----------------------------------------------------------------------
  // 2. GET /:owner/:slug — Project overview
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      const view = await service.getProject(owner, slug, user)
      return c.html(
        <Layout user={user}>
          <ProjectOverview view={view} owner={owner} user={user} />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // 3. GET /:owner/:slug/commits — Full history
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/commits', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')

    try {
      const history = await service.getHistory(owner, slug)
      return c.html(
        <Layout user={c.get('user')}>
          <CommitListPage history={history} owner={owner} slug={slug} />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // 4. GET /:owner/:slug/commit/:sha — Single commit / snapshot view
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/commit/:sha', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const sha = c.req.param('sha')
    const user = c.get('user')

    try {
      const view = await service.getProjectAtRef(owner, slug, sha, user)
      return c.html(
        <Layout user={user}>
          <ProjectOverview
            view={view}
            owner={owner}
            user={user}
            viewingSha={sha}
          />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // 5. GET /:owner/:slug/tree/:ref and GET /:owner/:slug/tree/:ref/*
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/tree/:ref', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const ref = c.req.param('ref')

    try {
      const entries = await service.getTree(owner, slug, ref, '')
      return c.html(
        <Layout user={c.get('user')}>
          <TreePage
            entries={entries}
            owner={owner}
            slug={slug}
            ref={ref}
            path=""
          />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  app.get('/:owner/:slug/tree/:ref/*', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const ref = c.req.param('ref')
    const path = c.req.path.split(`/tree/${ref}/`)[1] ?? ''

    try {
      const entries = await service.getTree(owner, slug, ref, path)
      return c.html(
        <Layout user={c.get('user')}>
          <TreePage
            entries={entries}
            owner={owner}
            slug={slug}
            ref={ref}
            path={path}
          />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // 6. GET /:owner/:slug/blob/:ref/* — View file
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/blob/:ref/*', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const ref = c.req.param('ref')
    const path = c.req.path.split(`/blob/${ref}/`)[1] ?? ''

    try {
      const content = await service.getFileContent(owner, slug, ref, path)
      if (!content) {
        return c.html(
          <Layout user={c.get('user')}>
            <ErrorPage statusCode={404} message="File not found" />
          </Layout>,
          404,
        )
      }

      return c.html(
        <Layout user={c.get('user')}>
          <BlobPage
            content={content}
            owner={owner}
            slug={slug}
            ref={ref}
            path={path}
          />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // 7. GET /:owner/:slug/settings — Settings page (owner only)
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/settings', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) {
        throw new UnauthenticatedError()
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

      return c.html(
        <Layout user={user}>
          <SettingsPage project={view.project} owner={owner} />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // 8. POST /:owner/:slug/settings — Settings actions
  // -----------------------------------------------------------------------
  app.post('/:owner/:slug/settings', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) {
        throw new UnauthenticatedError()
      }

      const body = await c.req.parseBody()
      const action = body.action as string

      if (action === 'delete') {
        await service.deleteProject(owner, slug, user)
        return c.redirect(resolveUrl(`/${owner}`))
      }

      if (action === 'retry') {
        await service.retryExtraction(owner, slug, user)
        return c.redirect(resolveUrl(`/${owner}/${slug}`))
      }

      return c.html(
        <Layout user={user}>
          <ErrorPage statusCode={400} message="Unknown action" />
        </Layout>,
        400,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // 9. POST /:owner/:slug/fork — Fork
  // -----------------------------------------------------------------------
  app.post('/:owner/:slug/fork', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      if (!user) {
        throw new UnauthenticatedError()
      }

      const forked = await service.forkProject(owner, slug, user)
      return c.redirect(resolveUrl(`/${user.login}/${forked.slug}`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  return app
}

// ---------------------------------------------------------------------------
// Error handler
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
