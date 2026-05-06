import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { Layout } from '../../../../design-system/components/flex-layout'
import type { UserStore } from '../../../../services/auth'
import type { ProjectService } from '../../../../services/projects'
import { getCorpusMetadata } from '../../../../services/rag'
import { resolveVariantBadge } from '../../../../services/variant-preferences'
import { resolveUrl } from '../../../../shared/base-path'
import { AppError, UnauthenticatedError } from '../../../../shared/errors'
import type { VariantRegistry } from '../../../../shared/strategy-registry'
import {
  BlobPage,
  CommitListPage,
  ErrorPage,
  ProfilePage,
  ProjectOverview,
  PullRequestsPage,
  SettingsPage,
  TreePage,
} from './components'

function getExternalOrigin(c: Context): string {
  const proto =
    c.req.header('x-forwarded-proto') ||
    new URL(c.req.url).protocol.replace(':', '')
  const host =
    c.req.header('x-forwarded-host') ||
    c.req.header('host') ||
    new URL(c.req.url).host
  return `${proto}://${host}`
}

export function createOwnerRoutes(
  service: ProjectService,
  userStore: UserStore,
  extractionRegistry: VariantRegistry<unknown>,
): Hono {
  const app = new Hono()

  // -----------------------------------------------------------------------
  // 1. GET /:owner — Profile page
  // -----------------------------------------------------------------------
  app.get('/:owner', async (c) => {
    const owner = c.req.param('owner')
    const projects = service.listUserProjects(owner)
    const profile = userStore.get(owner)

    // Profile records are stored per deployment (each branch app has its
    // own SQLite), so a user who has only signed in on a different branch
    // won't have a record here. Rather than 404 on a valid-looking
    // username — which breaks shareable profile URLs across branches —
    // fall back to a minimal profile using the login as the display name.
    const displayProfile = profile ?? {
      login: owner,
      name: owner,
      avatarUrl: '',
      createdAt: 0,
      updatedAt: 0,
    }

    return c.html(
      <Layout user={c.get('user')} currentSection="projects">
        <ProfilePage
          user={displayProfile}
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
    const branch = c.req.query('branch') ?? 'main'

    try {
      const [view, branches] = await Promise.all([
        service.getProject(owner, slug, user, branch),
        service.listBranches(slug),
      ])
      const origin = getExternalOrigin(c)
      // Read extraction provenance from the branch being viewed so the
      // badge reflects which variant produced the currently-displayed
      // spec (including on pre-promotion `import` branches).
      const provenanceBranch =
        branch !== 'main' ? branch : (view.pendingBranch ?? 'main')
      const extractionProvenance = await service.getProvenance(
        owner,
        slug,
        'extraction',
        provenanceBranch,
      )
      const extractionBadge = extractionProvenance
        ? resolveVariantBadge(
            extractionRegistry,
            extractionProvenance.variantId,
          )
        : null
      const corpusMetadata = view.project.corpusSlug
        ? getCorpusMetadata(view.project.corpusSlug)
        : null
      const corpus = corpusMetadata
        ? {
            slug: corpusMetadata.slug,
            formName: corpusMetadata.formName,
            formDescription: corpusMetadata.formDescription ?? '',
            source: corpusMetadata.source,
          }
        : null
      return c.html(
        <Layout user={user} currentSection="projects">
          <ProjectOverview
            view={view}
            owner={owner}
            user={user}
            origin={origin}
            branches={branches}
            branch={branch}
            extractionBadge={extractionBadge}
            corpus={corpus}
          />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // -----------------------------------------------------------------------
  // 2b. GET /:owner/:slug/pulls — Pull requests
  // -----------------------------------------------------------------------
  app.get('/:owner/:slug/pulls', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')

    try {
      const [view, branches] = await Promise.all([
        service.getProject(owner, slug, user),
        service.listBranches(slug),
      ])
      return c.html(
        <Layout
          user={user}
          title={`Pull Requests — ${view.project.name}`}
          currentSection="projects"
        >
          <PullRequestsPage view={view} owner={owner} branches={branches} />
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
        <Layout user={c.get('user')} currentSection="projects">
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
      const extractionProvenance = await service.getProvenance(
        owner,
        slug,
        'extraction',
        sha,
      )
      const extractionBadge = extractionProvenance
        ? resolveVariantBadge(
            extractionRegistry,
            extractionProvenance.variantId,
          )
        : null
      const corpusMetadata = view.project.corpusSlug
        ? getCorpusMetadata(view.project.corpusSlug)
        : null
      const corpus = corpusMetadata
        ? {
            slug: corpusMetadata.slug,
            formName: corpusMetadata.formName,
            formDescription: corpusMetadata.formDescription ?? '',
            source: corpusMetadata.source,
          }
        : null
      return c.html(
        <Layout user={user} currentSection="projects">
          <ProjectOverview
            view={view}
            owner={owner}
            user={user}
            viewingSha={sha}
            extractionBadge={extractionBadge}
            corpus={corpus}
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
        <Layout user={c.get('user')} currentSection="projects">
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
        <Layout user={c.get('user')} currentSection="projects">
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
          <Layout user={c.get('user')} currentSection="projects">
            <ErrorPage statusCode={404} message="File not found" />
          </Layout>,
          404,
        )
      }

      return c.html(
        <Layout user={c.get('user')} currentSection="projects">
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
          <Layout user={user} currentSection="projects">
            <ErrorPage statusCode={403} message="Permission denied" />
          </Layout>,
          403,
        )
      }

      return c.html(
        <Layout user={user} currentSection="projects">
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
        <Layout user={user} currentSection="projects">
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
      <Layout user={c.get('user')} currentSection="projects">
        <ErrorPage statusCode={err.statusCode} message={err.message} />
      </Layout>,
      err.statusCode as ContentfulStatusCode,
    )
  }
  throw err
}
