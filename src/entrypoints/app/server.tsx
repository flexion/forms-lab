import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import {
  demoFixtures,
  getFixture,
  loadFixturePdf,
} from '../../../fixtures/index'
import { Layout } from '../../design-system/components/flex-layout'
import { createUserStore } from '../../services/auth'
import type { DataCollectionSpec } from '../../services/data-collection'
import { createExtractorRegistry } from '../../services/extraction'
import {
  createAuthoringCriteriaRegistry,
  createAuthoringGenerationRegistry,
  createAuthoringStructureRegistry,
} from '../../services/form-authoring'
import {
  createCachedPdfExtractor,
  createMappingRegistry,
} from '../../services/form-documents'
import type { FormSpec } from '../../services/forms'
import {
  BedrockFillingAgent,
  createFillingRegistry,
  createReviewService,
  createShapingRegistry,
  createSpecSnapshotStore,
  ScriptedFillingAgent,
  SqliteConversationGateway,
  SqliteFormSessionGateway,
  SqliteSubmissionGateway,
} from '../../services/forms'
import {
  createFormProjectRepo,
  createProjectService,
} from '../../services/projects'
import { getCorpusMetadata, listCorpora } from '../../services/rag'
import { createCacheStore, createProjectStore } from '../../services/storage'
import {
  createVariantPreferencesGateway,
  createVariantPreferencesService,
  type TaskRegistries,
} from '../../services/variant-preferences'
import { getBasePath, resolveUrl } from '../../shared/base-path'
import { requireAuth, sessionReader } from './middleware/auth'
import { createAuthRoutes } from './routes/auth/index'
import catalog from './routes/catalog/index'
import { createFormRouter } from './routes/forms/index'
import { createCompareRoutes } from './routes/owner/compare/index'
import {
  Dashboard,
  LandingPage,
  NewProjectPage,
} from './routes/owner/components'
import { createEditRoutes } from './routes/owner/edit/index'
import { createOwnerRoutes } from './routes/owner/index'
import presentation from './routes/presentation/index'
import { createSettingsRoutes } from './routes/settings/index'

const basePath = getBasePath()
const app = new Hono().basePath(basePath)

const projectDbPath = process.env.PROJECT_DB_PATH ?? 'data/projects.sqlite'
const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite' // Shared across branches in production
const reposPath = process.env.REPOS_PATH ?? 'data/repos'
mkdirSync(dirname(projectDbPath), { recursive: true })
mkdirSync(dirname(cacheDbPath), { recursive: true })
mkdirSync(reposPath, { recursive: true })

const projectStore = createProjectStore(projectDbPath)
const cacheStore = createCacheStore(cacheDbPath)
const userStore = createUserStore(projectDbPath)
const formProjectRepo = createFormProjectRepo(reposPath)

// Variant registries: one per task. Each user's preferred variant is
// resolved against these at call time so a settings change takes effect
// on the next extraction without restarting the process.
const extractionRegistry = createExtractorRegistry()
const shapingRegistry = createShapingRegistry()
const fillingRegistry = createFillingRegistry()
const mappingRegistry = createMappingRegistry()
const authoringCriteriaRegistry = createAuthoringCriteriaRegistry()
const authoringStructureRegistry = createAuthoringStructureRegistry()
const authoringGenerationRegistry = createAuthoringGenerationRegistry()
const registries: TaskRegistries = {
  extraction: extractionRegistry,
  shaping: shapingRegistry,
  filling: fillingRegistry,
  'field-mapping': mappingRegistry,
  'authoring-criteria': authoringCriteriaRegistry,
  'authoring-structure': authoringStructureRegistry,
  'authoring-generation': authoringGenerationRegistry,
}

const variantPrefsGateway = createVariantPreferencesGateway(projectDbPath)
const variantPreferences = createVariantPreferencesService(
  variantPrefsGateway,
  registries,
)

const projectService = createProjectService(projectStore, formProjectRepo, {
  resolveExtractor(variantId) {
    const inner = extractionRegistry.get(variantId)
    const meta = extractionRegistry.list().find((v) => v.id === variantId)
    return createCachedPdfExtractor(
      inner,
      cacheStore,
      meta?.metadata.modelId,
      variantId,
    )
  },
  resolveVariant(userLogin) {
    const variantId =
      variantPreferences.get(userLogin, 'extraction') ??
      extractionRegistry.getDefaultId()
    const meta = extractionRegistry.list().find((v) => v.id === variantId)
    return { variantId, modelId: meta?.metadata.modelId }
  },
})
const reviewService = createReviewService(formProjectRepo)
const formsDbPath = process.env.FORMS_DB_PATH ?? 'data/forms.sqlite'
mkdirSync(dirname(formsDbPath), { recursive: true })
const sessionGateway = new SqliteFormSessionGateway(formsDbPath)
const submissionGateway = new SqliteSubmissionGateway(formsDbPath)
const specSnapshotStore = createSpecSnapshotStore(formsDbPath)
const conversationGateway = new SqliteConversationGateway(formsDbPath)
const fillingAgent =
  process.env.USE_SCRIPTED_AGENT === 'true'
    ? new ScriptedFillingAgent()
    : new BedrockFillingAgent()

/**
 * Adapter: resolve a DataCollectionSpec id to (owner, slug, spec, formSpec)
 * by scanning ready projects. specId is assigned by the extractor and is
 * independent of the project slug, so we scan all projects and read their
 * main-branch spec to build the mapping. Slow-ish for many projects; fine
 * at current scale. Branch-qualified refs are supported via the `ref`
 * argument to `getSpecs`.
 */
async function readProjectSpecs(
  slug: string,
  ref: string,
): Promise<{
  dataSpec: DataCollectionSpec
  formSpec: FormSpec
  sha: string
} | null> {
  const [specBuf, formBuf, history] = await Promise.all([
    formProjectRepo.readFile(slug, ref, 'forms/default/spec.json'),
    formProjectRepo.readFile(slug, ref, 'forms/default/form.json'),
    formProjectRepo.log(slug, ref, undefined, 1),
  ])
  if (!specBuf || !formBuf || history.length === 0) return null
  return {
    dataSpec: JSON.parse(specBuf.toString()) as DataCollectionSpec,
    formSpec: JSON.parse(formBuf.toString()) as FormSpec,
    sha: history[0].sha,
  }
}

// Cached specId -> (owner, slug) mapping. Populated as a side effect of
// `findProjectBySpecId` and consulted synchronously by `getEditHref`. This
// is best-effort: newly-created projects won't have an entry until a
// request for that spec lands. Acceptable for the demo; revisit if the
// catalog grows large.
const specIdIndex = new Map<string, { owner: string; slug: string }>()

async function findProjectBySpecId(
  specId: string,
): Promise<{ slug: string; owner: string } | null> {
  for (const project of projectStore.list()) {
    if (project.status !== 'ready') continue
    try {
      const resolved = await readProjectSpecs(project.slug, 'main')
      if (resolved) {
        specIdIndex.set(resolved.dataSpec.id, {
          owner: project.createdBy,
          slug: project.slug,
        })
        if (resolved.dataSpec.id === specId) {
          return { slug: project.slug, owner: project.createdBy }
        }
      }
    } catch {
      // Ignore repos that fail to read — project may be mid-extraction
      // or have been externally removed.
    }
  }
  return null
}

// Apply session reader globally
app.use('*', sessionReader())

// USWDS icon sprite
app.get('/static/sprite.svg', async (c) => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const svg = await readFile(
    resolve(process.cwd(), 'node_modules/@uswds/uswds/dist/img/sprite.svg'),
    'utf-8',
  )
  c.header('Content-Type', 'image/svg+xml')
  c.header('Cache-Control', 'public, max-age=31536000')
  return c.body(svg)
})

// USWDS images (flag, banner icons, etc.)
app.get('/static/img/:name', async (c) => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const name = c.req.param('name')
  // Only serve known USWDS image files
  const allowed = [
    'us_flag_small.png',
    'icon-dot-gov.svg',
    'icon-https.svg',
    'logo-img.png',
    'hero.jpg',
  ]
  if (!allowed.includes(name)) return c.notFound()
  const filePath = resolve(
    process.cwd(),
    `node_modules/@uswds/uswds/dist/img/${name}`,
  )
  try {
    const data = await readFile(filePath)
    const ext = name.split('.').pop()
    const contentType =
      ext === 'svg'
        ? 'image/svg+xml'
        : ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream'
    c.header('Content-Type', contentType)
    c.header('Cache-Control', 'public, max-age=31536000')
    return c.body(data)
  } catch {
    return c.notFound()
  }
})

// Font files (self-hosted, matching USWDS)
app.use(
  '/static/fonts/*',
  serveStatic({
    root: './src/entrypoints/app/public',
    rewriteRequestPath: (path) => {
      // Strip basePath if present, then strip /static/
      let normalized = path
      if (basePath && path.startsWith(basePath)) {
        normalized = path.slice(basePath.length)
      }
      // Ensure leading slash
      if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`
      }
      return normalized.replace('/static/', '')
    },
  }),
)

// Static assets (CSS + JS build output)
app.use(
  '/static/*',
  serveStatic({
    root: './dist',
    rewriteRequestPath: (path) => {
      // Strip basePath if present, then strip /static
      let normalized = path
      if (basePath && path.startsWith(basePath)) {
        normalized = path.slice(basePath.length)
      }
      // Ensure leading slash
      if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`
      }
      return normalized.replace('/static', '')
    },
  }),
)

// Mount auth routes
app.route('/auth', createAuthRoutes(userStore))

// Mount settings routes (variant picker)
app.route(
  '/settings',
  createSettingsRoutes({ preferences: variantPreferences, registries }),
)

// Mount catalog routes
app.route('/catalog', catalog)

// Mount presentation routes
app.route('/presentation', presentation)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// New project routes (requires auth)
app.use('/new', requireAuth())

// Resolve the callout payload the /new page needs to describe the user's
// currently-selected extraction variant. Factored out because both GET and
// POST (on validation errors) re-render the same page.
function getExtractionVariantForCallout(userLogin: string) {
  const variantId =
    variantPreferences.get(userLogin, 'extraction') ??
    extractionRegistry.getDefaultId()
  const meta = extractionRegistry.list().find((v) => v.id === variantId)
  return {
    name: meta?.metadata.name ?? variantId,
    description: meta?.metadata.description ?? '',
    // TODO: Derive this from the set of fixtures that have ground truth AND
    // are reviewed (the evaluation CLI already does this). Hardcoding the
    // count matches today's fixture set.
    evaluationSummary: `${extractionRegistry.list().length} variants evaluated on 3 government PDF fixtures`,
    catalogHref: resolveUrl(
      meta?.metadata.catalogPath ?? '/catalog/experiments/pdf-field-extraction',
    ),
  }
}

/**
 * Build the list of corpus-based form choices the New Project page
 * offers. Only corpora that declare a formDescription (i.e. have
 * opted into authoring) appear — extraction-only corpora stay out of
 * the picker.
 */
function getCorporaForPicker(): Array<{
  slug: string
  formName: string
  formDescription: string
}> {
  return listCorpora({ formsOnly: true }).map((c) => ({
    slug: c.slug,
    formName: c.formName,
    formDescription: c.formDescription ?? '',
  }))
}

app.get('/new', (c) => {
  const user = c.get('user')
  if (!user) return c.redirect(resolveUrl('/auth/signin'))
  const extractionVariant = getExtractionVariantForCallout(user.login)
  return c.html(
    <Layout currentPath="/new" user={user}>
      <NewProjectPage
        fixtures={demoFixtures}
        corpora={getCorporaForPicker()}
        extractionVariant={extractionVariant}
      />
    </Layout>,
  )
})
app.post('/new', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect(resolveUrl('/auth/signin'))
  const extractionVariant = getExtractionVariantForCallout(user.login)

  try {
    // Parse form body - corpus, fixture, or file upload
    const contentType = c.req.header('content-type') ?? ''

    // Handle multipart/form-data (PDF upload)
    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody()
      const file = body.pdf
      if (!(file instanceof File) || file.size === 0) {
        return c.html(
          <Layout currentPath="/new" user={user}>
            <NewProjectPage
              fixtures={demoFixtures}
              corpora={getCorporaForPicker()}
              extractionVariant={extractionVariant}
            />
          </Layout>,
          400,
        )
      }
      const pdf = Buffer.from(await file.arrayBuffer())
      const name = file.name.replace(/\.pdf$/i, '')
      const project = await projectService.createProject(name, pdf, user)
      return c.redirect(
        resolveUrl(`/${user.login}/${project.slug}/edit/import`),
      )
    }

    // Handle application/x-www-form-urlencoded (corpus or fixture)
    const body = await c.req.parseBody()
    const corpusId = String(body.corpus ?? '').trim()

    if (corpusId) {
      // Corpus-only project (no PDF extraction). Persist the corpus
      // slug on the project so the authoring pipeline can retrieve
      // from the right corpus downstream.
      const corpusMetadata = getCorpusMetadata(corpusId)
      if (!corpusMetadata || !corpusMetadata.formDescription) {
        return c.html(
          <Layout currentPath="/new" user={user}>
            <NewProjectPage
              fixtures={demoFixtures}
              corpora={getCorporaForPicker()}
              extractionVariant={extractionVariant}
            />
          </Layout>,
          400,
        )
      }
      const project = await projectService.createEmptyProject(
        corpusMetadata.formName,
        user,
        { corpusSlug: corpusMetadata.slug },
      )
      return c.redirect(
        resolveUrl(`/${user.login}/${project.slug}/edit/import`),
      )
    }

    // Fixture-based project
    const fixtureSlug = body.fixture as string
    const fixture = getFixture(fixtureSlug)
    if (!fixture) {
      return c.html(
        <Layout currentPath="/new" user={user}>
          <NewProjectPage
            fixtures={demoFixtures}
            corpora={getCorporaForPicker()}
            extractionVariant={extractionVariant}
          />
        </Layout>,
        400,
      )
    }
    const pdf = loadFixturePdf(fixture)
    const name = fixture.name
    const project = await projectService.createProject(name, pdf, user)
    return c.redirect(resolveUrl(`/${user.login}/${project.slug}`))
  } catch (err) {
    console.error('Error creating project:', err)
    return c.html(
      <Layout currentPath="/new" user={user}>
        <div class="flex-alert flex-alert--error" role="alert">
          <h2>Error creating project</h2>
          <p>{err instanceof Error ? err.message : 'Unknown error occurred'}</p>
          <p>
            <a href={resolveUrl('/new')}>Try again</a>
          </p>
        </div>
      </Layout>,
      500,
    )
  }
})

// Root page - landing page for everyone, plus dashboard for authenticated users
app.get('/', (c) => {
  const user = c.get('user')
  const error = c.req.query('error') ?? null
  if (user) {
    const projects = projectService.listUserProjects(user.login)
    return c.html(
      <Layout currentPath="/" user={user}>
        <LandingPage error={error} user={user} />
        <Dashboard projects={projects} user={user} />
      </Layout>,
    )
  }
  return c.html(
    <Layout currentPath="/" user={user}>
      <LandingPage error={error} user={user} />
    </Layout>,
  )
})

// Mount edit routes BEFORE owner routes (more specific patterns first)
app.route(
  '/',
  createEditRoutes(projectService, shapingRegistry, variantPreferences),
)

// Mount compare routes BEFORE owner routes (more specific patterns first)
app.route(
  '/',
  createCompareRoutes(projectService, reviewService, shapingRegistry.list()),
)

// Mount form delivery routes under /forms. Fills and submissions are
// git-backed; preview banner links back to the editor on non-main
// branches.
app.route(
  '/forms',
  createFormRouter({
    sessionGateway,
    submissionGateway,
    conversationGateway,
    fillingAgent,
    specSnapshotStore,
    async getSpecs(specId, ref) {
      const project = await findProjectBySpecId(specId)
      if (!project) return null
      return readProjectSpecs(project.slug, ref ?? 'main')
    },
    async listSpecs() {
      const result: {
        dataSpec: DataCollectionSpec
        formSpec: FormSpec
        sha: string
      }[] = []
      for (const project of projectStore.list()) {
        if (project.status !== 'ready') continue
        try {
          const resolved = await readProjectSpecs(project.slug, 'main')
          if (resolved) {
            specIdIndex.set(resolved.dataSpec.id, {
              owner: project.createdBy,
              slug: project.slug,
            })
            result.push(resolved)
          }
        } catch {
          // Skip unreadable projects — best-effort listing.
        }
      }
      return result
    },
    getEditHref(specId, branch) {
      // Consult the cached specId -> (owner, slug) map populated by
      // `findProjectBySpecId`. If there's no entry (e.g. the cache is
      // cold or the spec is unknown) we omit the link rather than block
      // rendering on an async lookup.
      const entry = specIdIndex.get(specId)
      if (!entry) return null
      return resolveUrl(`/${entry.owner}/${entry.slug}/edit/${branch}`)
    },
    async getSourcePdf(specId, _specVersion) {
      const project = await findProjectBySpecId(specId)
      if (!project) return null
      return formProjectRepo.readFile(
        project.slug,
        'main',
        `source/${project.slug}.pdf`,
      )
    },
    async getFieldMapping(specId, specVersion) {
      const project = await findProjectBySpecId(specId)
      if (!project) return null
      const buf = await formProjectRepo.readFile(
        project.slug,
        specVersion,
        'forms/default/field-mapping.json',
      )
      if (!buf) return null
      return JSON.parse(buf.toString())
    },
  }),
)

// Mount owner routes LAST (catch-all pattern /:owner)
app.route('/', createOwnerRoutes(projectService, userStore, extractionRegistry))

export default app
