import { join } from 'node:path'
import { Hono } from 'hono'
import { StatusBadge } from '../../components/flex-badge'
import { Breadcrumb } from '../../components/flex-breadcrumb'
import { ContentCard } from '../../components/flex-card'
import { CatalogSidebar } from '../../components/flex-catalog-sidebar'
import { Layout } from '../../components/flex-layout'
import { Prose } from '../../components/flex-prose'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'
import { getCatalogSidebar } from './sidebar'

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
    <Layout title="Architecture" sidebar={sidebar} currentPath="/catalog">
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
              href={`/catalog/architecture/${file.filename}`}
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

    return c.html(
      <Layout title={title} sidebar={sidebar} currentPath="/catalog">
        <Breadcrumb
          items={[
            { label: 'Catalog', href: '/catalog' },
            { label: 'Architecture', href: '/catalog/architecture' },
            { label: title },
          ]}
        />
        <Prose content={file.content} />
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found" sidebar={sidebar} currentPath="/catalog">
        <Breadcrumb
          items={[
            { label: 'Catalog', href: '/catalog' },
            { label: 'Architecture', href: '/catalog/architecture' },
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
