import { join } from 'node:path'
import { Hono } from 'hono'
import { resolveUrl } from '../../../lib/base-path'
import { readMarkdownDir } from '../../../lib/markdown'
import { CatalogSidebar } from '../../components/flex-catalog-sidebar'
import { Layout } from '../../components/flex-layout'
import architecture from './architecture'
import decisions from './decisions'
import designSystem from './design-system'
import experiments from './experiments'
import personas from './personas'
import { getCatalogSidebar } from './sidebar'
import stories from './stories'

const catalog = new Hono()

// Mount sub-routes
catalog.route('/personas', personas)
catalog.route('/decisions', decisions)
catalog.route('/architecture', architecture)
catalog.route('/stories', stories)
catalog.route('/experiments', experiments)
catalog.route('/design-system', designSystem)

// Catalog landing page
catalog.get('/', async (c) => {
  const catalogDir = join(process.cwd(), 'catalog')

  const [personaFiles, storyFiles, architectureFiles] = await Promise.all([
    readMarkdownDir(join(catalogDir, 'personas')).catch(() => []),
    readMarkdownDir(join(catalogDir, 'stories')).catch(() => []),
    readMarkdownDir(join(catalogDir, 'architecture')).catch(() => []),
  ])

  // Count decisions across subdirectories
  const { readdir } = await import('node:fs/promises')
  let decisionCount = 0
  try {
    const groups = await readdir(join(catalogDir, 'decisions'), {
      withFileTypes: true,
    })
    for (const group of groups) {
      if (group.isDirectory()) {
        const files = await readMarkdownDir(
          join(catalogDir, 'decisions', group.name),
        )
        decisionCount += files.length
      }
    }
  } catch {
    // decisions directory may not exist yet
  }

  const sidebarData = getCatalogSidebar('/catalog')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout
      title="Catalog"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>Catalog</h1>
      <p>
        The catalog is the system's self-documentation: personas, stories,
        architecture, decisions, and experiments.
      </p>
      <div class="l-grid">
        <div class="content-card">
          <h2>
            <a href={resolveUrl('/catalog/personas')}>Personas</a>
          </h2>
          <p>{personaFiles.length} personas</p>
        </div>
        <div class="content-card">
          <h2>
            <a href={resolveUrl('/catalog/decisions')}>Decisions</a>
          </h2>
          <p>{decisionCount} decisions</p>
        </div>
        <div class="content-card">
          <h2>
            <a href={resolveUrl('/catalog/architecture')}>Architecture</a>
          </h2>
          <p>{architectureFiles.length} documents</p>
        </div>
        <div class="content-card">
          <h2>
            <a href={resolveUrl('/catalog/stories')}>Stories</a>
          </h2>
          <p>{storyFiles.length} stories</p>
        </div>
        <div class="content-card">
          <h2>
            <a href={resolveUrl('/catalog/experiments')}>Experiments</a>
          </h2>
          <p>Coming soon</p>
        </div>
        <div class="content-card">
          <h2>
            <a href={resolveUrl('/catalog/design-system')}>Design System</a>
          </h2>
          <p>Tokens, components, and compositions</p>
        </div>
      </div>
    </Layout>,
  )
})

export default catalog
