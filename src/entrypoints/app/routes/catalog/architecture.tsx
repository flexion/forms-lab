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
import { getCatalogSidebar } from './sidebar'

const diagramsBySlug: Record<string, GraphDefinition> = {
  'system-overview': systemOverviewGraph,
  'data-model': dataModelGraph,
  deployment: deploymentGraph,
  'threat-model': threatModelGraph,
  'software-architecture': softwareArchitectureGraph,
}

const architecture = new Hono()

architecture.get('/', async (c) => {
  const archDir = join(process.cwd(), 'catalog', 'architecture')
  let files: Awaited<ReturnType<typeof readMarkdownDir>> = []
  try {
    files = await readMarkdownDir(archDir)
  } catch {
    // directory may not exist
  }

  const sidebarData = getCatalogSidebar('/catalog/architecture')
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
        {files.map((file) => {
          const title =
            file.content.split('\n')[0]?.replace(/^#\s+/, '') || file.filename
          const status = file.frontmatter.status || 'draft'
          return (
            <ContentCard
              key={file.filename}
              title={title}
              href={resolveUrl(`/catalog/architecture/${file.filename}`)}
            >
              <StatusBadge status={status} />
            </ContentCard>
          )
        })}
        {files.length === 0 && (
          <p class="flex-empty">No architecture documents yet.</p>
        )}
      </div>
    </Layout>,
  )
})

architecture.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const filePath = join(process.cwd(), 'catalog', 'architecture', `${slug}.md`)

  const sidebarData = getCatalogSidebar('/catalog/architecture')
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
