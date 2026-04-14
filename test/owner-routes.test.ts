import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { createOwnerRoutes } from '../src/entrypoints/app/routes/owner/index'
import type { SessionUser } from '../src/services/auth/session'
import type { FormProjectRepo } from '../src/services/form-project-repo'
import { createFormProjectRepo } from '../src/services/form-project-repo'
import type { ProjectService } from '../src/services/project-service'
import { createProjectService } from '../src/services/project-service'
import { createProjectStore } from '../src/services/storage'
import { createUserStore } from '../src/services/user-store'
import type { ExtractionResult, ProjectIndex } from '../src/types/models'

const stubResult: ExtractionResult = {
  spec: {
    id: 'spec-1',
    title: 'Test Form',
    description: 'A test form',
    groups: [
      {
        id: 'g1',
        title: 'Personal Info',
        requirements: [
          {
            id: 'f1',
            fieldName: 'firstName',
            label: 'First name',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  },
  formSpec: {
    id: 'f1',
    specId: 'spec-1',
    title: 'Test Form',
    pages: [
      {
        id: 'page-1',
        title: 'Personal Information',
        groups: ['g1'],
        deliveryMode: 'conversational',
      },
    ],
    createdAt: '2026-04-14',
    updatedAt: '2026-04-14',
  },
  confidence: [{ fieldId: 'f1', confidence: 0.95 }],
}

const danielUser: SessionUser = {
  login: 'danielnaab',
  name: 'Daniel',
  avatarUrl: '',
}
const mayaUser: SessionUser = { login: 'maya', name: 'Maya', avatarUrl: '' }

let repoBasePath: string
let repo: FormProjectRepo

beforeEach(() => {
  repoBasePath = mkdtempSync(join(tmpdir(), 'owner-routes-test-'))
  repo = createFormProjectRepo(repoBasePath)
})

afterEach(() => {
  rmSync(repoBasePath, { recursive: true, force: true })
})

function createTestApp(authUser: SessionUser | null = danielUser) {
  const projectStore = createProjectStore(':memory:')
  const extractor = {
    async extract() {
      return stubResult
    },
  }
  const service = createProjectService(projectStore, repo, extractor)
  const userStore = createUserStore(':memory:')

  // Seed the user store
  userStore.upsert({ login: 'danielnaab', name: 'Daniel', avatarUrl: '' })
  userStore.upsert({ login: 'maya', name: 'Maya', avatarUrl: '' })

  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', authUser)
    await next()
  })
  app.route('/', createOwnerRoutes(service, userStore))

  return { app, service, projectStore, repo, userStore }
}

/** Helper: wait for async extraction to complete */
async function waitForReady(
  projectStore: ReturnType<typeof createProjectStore>,
  projectId: string,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const p = projectStore.get(projectId)
    if (p?.status === 'ready') return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error(`Timed out waiting for project ${projectId} to become ready`)
}

/** Helper: create a project and wait for extraction to finish */
async function createReadyProject(
  service: ProjectService,
  projectStore: ReturnType<typeof createProjectStore>,
  user: SessionUser = danielUser,
  name = 'Test Form',
): Promise<ProjectIndex> {
  const project = await service.createProject(
    name,
    Buffer.from('%PDF-1.4 sample'),
    user,
  )
  await waitForReady(projectStore, project.id)
  return projectStore.get(project.id) as ProjectIndex
}

// ---------------------------------------------------------------------------
// GET /:owner (profile page)
// ---------------------------------------------------------------------------

describe('GET /:owner (profile)', () => {
  it('returns 200 with project list', async () => {
    const { app, service, projectStore } = createTestApp()
    await createReadyProject(service, projectStore)

    const res = await app.request('/danielnaab')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Daniel')
    expect(html).toContain('Test Form')
  })

  it('returns 200 with empty project list', async () => {
    const { app } = createTestApp()
    const res = await app.request('/danielnaab')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Daniel')
    expect(html).toContain('No projects yet')
  })

  it('returns 404 for nonexistent user', async () => {
    const { app } = createTestApp()
    const res = await app.request('/nonexistent')
    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain('User not found')
  })
})

// ---------------------------------------------------------------------------
// GET /:owner/:slug (project overview)
// ---------------------------------------------------------------------------

describe('GET /:owner/:slug (project overview)', () => {
  it('returns 200 for owner viewing own project', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Test Form')
    expect(html).toContain('Extracted Data Requirements')
    expect(html).toContain('project-summary')
  })

  it('returns 200 for anonymous viewer (public)', async () => {
    // Create project as daniel using a service-level call
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    // Now create an anonymous app to request the same project
    const anonApp = new Hono()
    anonApp.use('*', async (c, next) => {
      c.set('user', null)
      await next()
    })
    anonApp.route('/', createOwnerRoutes(service, userStore))

    const res = await anonApp.request(`/danielnaab/${project.slug}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Test Form')
  })

  it('returns 404 for nonexistent project', async () => {
    const { app } = createTestApp()
    const res = await app.request('/danielnaab/nonexistent')
    expect(res.status).toBe(404)
  })

  it('returns 404 when owner does not match project creator', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    await createReadyProject(service, projectStore)

    const res = await app.request('/maya/test-form')
    expect(res.status).toBe(404)
  })

  it('shows extracting status with auto-refresh', async () => {
    // Use a slow extractor so the project stays in 'extracting' state
    const slowStore = createProjectStore(':memory:')
    const slowRepo = createFormProjectRepo(repoBasePath)
    const slowExtractor = {
      async extract() {
        await new Promise((r) => setTimeout(r, 5000))
        return stubResult
      },
    }
    const slowService = createProjectService(slowStore, slowRepo, slowExtractor)
    const slowUserStore = createUserStore(':memory:')
    slowUserStore.upsert({
      login: 'danielnaab',
      name: 'Daniel',
      avatarUrl: '',
    })
    const slowApp = new Hono()
    slowApp.use('*', async (c, next) => {
      c.set('user', danielUser)
      await next()
    })
    slowApp.route('/', createOwnerRoutes(slowService, slowUserStore))
    const project = await slowService.createProject(
      'Slow Form',
      Buffer.from('%PDF-1.4 sample'),
      danielUser,
    )

    const res = await slowApp.request(`/danielnaab/${project.slug}`)
    const html = await res.text()
    expect(html).toContain('Extracting form structure')
    expect(html).toContain('http-equiv="refresh"')
  })

  it('shows error status with error message', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await service.createProject(
      'Error Form',
      Buffer.from('%PDF-1.4 sample'),
      danielUser,
    )
    await waitForReady(projectStore, project.id)
    projectStore.update(project.id, {
      status: 'error',
      error: 'Model timeout after 60 seconds',
    })

    const res = await app.request(`/danielnaab/${project.slug}`)
    const html = await res.text()
    expect(html).toContain('Extraction failed')
    expect(html).toContain('Model timeout after 60 seconds')
  })

  it('shows version history', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}`)
    const html = await res.text()
    expect(html).toContain('History')
    expect(html).toContain('Initialize project')
  })

  it('shows clone URL', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}`)
    const html = await res.text()
    expect(html).toContain(`/git/${project.slug}.git`)
    expect(html).toContain('git clone')
  })
})

// ---------------------------------------------------------------------------
// GET /:owner/:slug/settings (owner-only)
// ---------------------------------------------------------------------------

describe('GET /:owner/:slug/settings', () => {
  it('returns 200 for owner', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}/settings`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Settings')
    expect(html).toContain('Delete project')
    expect(html).toContain('Re-extract')
  })

  it('returns 403 for non-owner', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    // Create app as maya
    const mayaApp = new Hono()
    mayaApp.use('*', async (c, next) => {
      c.set('user', mayaUser)
      await next()
    })
    mayaApp.route('/', createOwnerRoutes(service, userStore))

    const res = await mayaApp.request(`/danielnaab/${project.slug}/settings`)
    expect(res.status).toBe(403)
    const html = await res.text()
    expect(html).toContain('Permission denied')
  })

  it('redirects to signin for anonymous', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const anonApp = new Hono()
    anonApp.use('*', async (c, next) => {
      c.set('user', null)
      await next()
    })
    anonApp.route('/', createOwnerRoutes(service, userStore))

    const res = await anonApp.request(`/danielnaab/${project.slug}/settings`, {
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/signin')
  })
})

// ---------------------------------------------------------------------------
// POST /:owner/:slug/settings (owner-only actions)
// ---------------------------------------------------------------------------

describe('POST /:owner/:slug/settings', () => {
  it('action=delete deletes project for owner', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=delete',
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/danielnaab')
    expect(projectStore.get(project.id)).toBeNull()
  })

  it('action=delete returns 403 for non-owner', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const mayaApp = new Hono()
    mayaApp.use('*', async (c, next) => {
      c.set('user', mayaUser)
      await next()
    })
    mayaApp.route('/', createOwnerRoutes(service, userStore))

    const res = await mayaApp.request(`/danielnaab/${project.slug}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=delete',
    })
    expect(res.status).toBe(403)
    // Project should still exist
    expect(projectStore.get(project.id)).not.toBeNull()
  })

  it('action=retry sets status to extracting for owner', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)
    projectStore.update(project.id, {
      status: 'error',
      error: 'timeout',
    })

    const res = await app.request(`/danielnaab/${project.slug}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=retry',
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain(`/danielnaab/${project.slug}`)

    // Give extraction a moment to start
    await new Promise((r) => setTimeout(r, 50))
    const updated = projectStore.get(project.id)
    // Should be extracting or ready (stub resolves fast)
    expect(updated).not.toBeNull()
    // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
    expect(['extracting', 'ready']).toContain(updated!.status)
  })

  it('action=retry returns 403 for non-owner', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const mayaApp = new Hono()
    mayaApp.use('*', async (c, next) => {
      c.set('user', mayaUser)
      await next()
    })
    mayaApp.route('/', createOwnerRoutes(service, userStore))

    const res = await mayaApp.request(`/danielnaab/${project.slug}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=retry',
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 for unknown action', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=bogus',
    })
    expect(res.status).toBe(400)
    const html = await res.text()
    expect(html).toContain('Unknown action')
  })

  it('redirects to signin for anonymous', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const anonApp = new Hono()
    anonApp.use('*', async (c, next) => {
      c.set('user', null)
      await next()
    })
    anonApp.route('/', createOwnerRoutes(service, userStore))

    const res = await anonApp.request(`/danielnaab/${project.slug}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=delete',
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/signin')
  })
})

// ---------------------------------------------------------------------------
// POST /:owner/:slug/fork
// ---------------------------------------------------------------------------

describe('POST /:owner/:slug/fork', () => {
  it('creates fork for non-owner', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    // Fork as maya
    const mayaApp = new Hono()
    mayaApp.use('*', async (c, next) => {
      c.set('user', mayaUser)
      await next()
    })
    mayaApp.route('/', createOwnerRoutes(service, userStore))

    const res = await mayaApp.request(`/danielnaab/${project.slug}/fork`, {
      method: 'POST',
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('Location') ?? ''
    expect(location).toContain('/maya/')
  })

  it('returns 400 when forking own project', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}/fork`, {
      method: 'POST',
    })
    expect(res.status).toBe(400)
    const html = await res.text()
    expect(html).toContain('Cannot fork your own project')
  })

  it('redirects to signin for anonymous', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const anonApp = new Hono()
    anonApp.use('*', async (c, next) => {
      c.set('user', null)
      await next()
    })
    anonApp.route('/', createOwnerRoutes(service, userStore))

    const res = await anonApp.request(`/danielnaab/${project.slug}/fork`, {
      method: 'POST',
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/auth/signin')
  })

  it('forked project shows on forker profile', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    // Fork as maya
    const mayaApp = new Hono()
    mayaApp.use('*', async (c, next) => {
      c.set('user', mayaUser)
      await next()
    })
    mayaApp.route('/', createOwnerRoutes(service, userStore))

    await mayaApp.request(`/danielnaab/${project.slug}/fork`, {
      method: 'POST',
      redirect: 'manual',
    })

    // Check maya's profile page
    const profileRes = await mayaApp.request('/maya')
    expect(profileRes.status).toBe(200)
    const html = await profileRes.text()
    expect(html).toContain('Test Form')
    expect(html).toContain('forked from')
    expect(html).toContain('danielnaab')
  })
})

// ---------------------------------------------------------------------------
// GET /:owner/:slug/tree/:ref (git browsing)
// ---------------------------------------------------------------------------

describe('GET /:owner/:slug/tree/:ref', () => {
  it('lists repository tree entries', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}/tree/main`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('project.json')
    expect(html).toContain('source')
    expect(html).toContain('forms')
  })

  it('returns 404 for nonexistent project', async () => {
    const { app } = createTestApp()
    const res = await app.request('/danielnaab/nonexistent/tree/main')
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// GET /:owner/:slug/blob/:ref/*path (git file view)
// ---------------------------------------------------------------------------

describe('GET /:owner/:slug/blob/:ref/*path', () => {
  it('shows file content', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(
      `/danielnaab/${project.slug}/blob/main/project.json`,
    )
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Test Form')
  })

  it('returns 404 for nonexistent file', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(
      `/danielnaab/${project.slug}/blob/main/nonexistent.json`,
    )
    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain('File not found')
  })
})

// ---------------------------------------------------------------------------
// GET /:owner/:slug/commits (commit history)
// ---------------------------------------------------------------------------

describe('GET /:owner/:slug/commits', () => {
  it('shows commit history', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}/commits`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Commits')
    expect(html).toContain('Initialize project')
    expect(html).toContain('Extract form specifications')
  })

  it('returns 404 for nonexistent project', async () => {
    const { app } = createTestApp()
    const res = await app.request('/danielnaab/nonexistent/commits')
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// GET /:owner/:slug/commit/:sha (snapshot view)
// ---------------------------------------------------------------------------

describe('GET /:owner/:slug/commit/:sha', () => {
  it('shows snapshot at specific SHA', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const history = await service.getHistory('danielnaab', project.slug)
    const sha = history[0].sha

    const res = await app.request(`/danielnaab/${project.slug}/commit/${sha}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Viewing snapshot')
    expect(html).toContain(sha.slice(0, 8))
    expect(html).toContain('View latest')
  })
})

// ---------------------------------------------------------------------------
// UI permissions (owner vs non-owner vs anonymous)
// ---------------------------------------------------------------------------

describe('UI permissions', () => {
  it('owner sees settings link, no fork button', async () => {
    const { app, service, projectStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const res = await app.request(`/danielnaab/${project.slug}`)
    const html = await res.text()
    expect(html).toContain('Settings')
    expect(html).not.toContain('>Fork<')
  })

  it('non-owner sees fork button, no settings link', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const mayaApp = new Hono()
    mayaApp.use('*', async (c, next) => {
      c.set('user', mayaUser)
      await next()
    })
    mayaApp.route('/', createOwnerRoutes(service, userStore))

    const res = await mayaApp.request(`/danielnaab/${project.slug}`)
    const html = await res.text()
    expect(html).toContain('Fork')
    expect(html).not.toContain('/settings')
  })

  it('anonymous sees sign-in-to-fork link', async () => {
    const { service, projectStore, userStore } = createTestApp(danielUser)
    const project = await createReadyProject(service, projectStore)

    const anonApp = new Hono()
    anonApp.use('*', async (c, next) => {
      c.set('user', null)
      await next()
    })
    anonApp.route('/', createOwnerRoutes(service, userStore))

    const res = await anonApp.request(`/danielnaab/${project.slug}`)
    const html = await res.text()
    expect(html).toContain('Sign in to fork')
    expect(html).not.toContain('/settings')
  })
})
