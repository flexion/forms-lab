import { join } from 'node:path'
import { Hono } from 'hono'
import { StatusBadge } from '../../../../design-system/components/flex-badge'
import { Breadcrumb } from '../../../../design-system/components/flex-breadcrumb'
import { ContentCard } from '../../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../../design-system/components/flex-catalog-sidebar'
import { DiagramRenderer } from '../../../../design-system/components/flex-diagram'
import { dataModelGraph } from '../../../../design-system/components/flex-diagram/diagrams/data-model'
import { deploymentGraph } from '../../../../design-system/components/flex-diagram/diagrams/deployment'
import { softwareArchitectureGraph } from '../../../../design-system/components/flex-diagram/diagrams/software-architecture'
import { systemOverviewGraph } from '../../../../design-system/components/flex-diagram/diagrams/system-overview'
import { threatModelGraph } from '../../../../design-system/components/flex-diagram/diagrams/threat-model'
import type { GraphDefinition } from '../../../../design-system/components/flex-diagram/types'
import { Layout } from '../../../../design-system/components/flex-layout'
import { Prose } from '../../../../design-system/components/flex-prose'
import {
  parseMarkdown,
  readMarkdownDir,
  renderMarkdown,
} from '../../../../services/content/markdown'
import { resolveUrl } from '../../../../shared/base-path'
import { getArchitectureSidebar } from './sidebar'

const diagramsBySlug: Record<string, GraphDefinition> = {
  'system-overview': systemOverviewGraph,
  'data-model': dataModelGraph,
  deployment: deploymentGraph,
  'threat-model': threatModelGraph,
  'software-architecture': softwareArchitectureGraph,
}

interface ArchitectureDocSummary {
  slug: string
  title: string
  status: string
}

async function loadArchitectureDocs(): Promise<ArchitectureDocSummary[]> {
  const archDir = join(process.cwd(), 'catalog', 'architecture')
  try {
    const files = await readMarkdownDir(archDir)
    return files.map((file) => ({
      slug: file.filename,
      title: file.content.split('\n')[0]?.replace(/^#\s+/, '') || file.filename,
      status: file.frontmatter.status || 'draft',
    }))
  } catch {
    return []
  }
}

const architecture = new Hono()

architecture.get('/', async (c) => {
  const docs = await loadArchitectureDocs()

  const sidebarData = getArchitectureSidebar(docs, '/catalog/architecture')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout
      title="Architecture"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>Architecture</h1>
      <p>System documentation describing how Forms Lab works.</p>
      <div class="l-stack">
        {docs.map((doc) => (
          <ContentCard
            key={doc.slug}
            title={doc.title}
            href={resolveUrl(`/catalog/architecture/${doc.slug}`)}
          >
            <StatusBadge status={doc.status} />
          </ContentCard>
        ))}
        {docs.length === 0 && (
          <p class="flex-empty">No architecture documents yet.</p>
        )}
      </div>
    </Layout>,
  )
})

architecture.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const filePath = join(process.cwd(), 'catalog', 'architecture', `${slug}.md`)

  const docs = await loadArchitectureDocs()
  const currentPath = `/catalog/architecture/${slug}`
  const sidebarData = getArchitectureSidebar(docs, currentPath)
  const sidebar = <CatalogSidebar sections={sidebarData} />

  try {
    const file = await parseMarkdown(filePath)
    const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || slug
    const diagram = diagramsBySlug[slug]

    return c.html(
      <Layout
        title={title}
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <Breadcrumb
          items={[
            { label: 'Catalog', href: resolveUrl('/catalog') },
            {
              label: 'Architecture',
              href: resolveUrl('/catalog/architecture'),
            },
            { label: title },
          ]}
        />
        {diagram && <DiagramRenderer graph={diagram} />}
        <Prose html={renderMarkdown(file.content)} />
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout
        title="Not Found"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <Breadcrumb
          items={[
            { label: 'Catalog', href: resolveUrl('/catalog') },
            {
              label: 'Architecture',
              href: resolveUrl('/catalog/architecture'),
            },
            { label: 'Not Found' },
          ]}
        />
        <h1>Document Not Found</h1>
      </Layout>,
      404,
    )
  }
})

export default architecture
