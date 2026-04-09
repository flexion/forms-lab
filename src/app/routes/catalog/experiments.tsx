import { join } from 'node:path'
import { Hono } from 'hono'
import { resolveUrl } from '../../../lib/base-path'
import { parseMarkdown, readMarkdownDir } from '../../../lib/markdown'
import { StatusBadge } from '../../components/flex-badge'
import { ContentCard } from '../../components/flex-card'
import { CatalogSidebar } from '../../components/flex-catalog-sidebar'
import { Layout } from '../../components/flex-layout'
import { Prose } from '../../components/flex-prose'
import { getCatalogSidebar } from './sidebar'

const experiments = new Hono()

experiments.get('/', async (c) => {
  const expDir = join(process.cwd(), 'catalog', 'experiments')
  let files: Awaited<ReturnType<typeof readMarkdownDir>> = []
  try {
    files = await readMarkdownDir(expDir)
  } catch {
    // directory may not exist
  }

  const sidebarData = getCatalogSidebar('/catalog/experiments')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout title="Experiments" sidebar={sidebar} currentPath="/catalog">
      <h1>Experiments</h1>
      <p>
        LLM experiments comparing baseline and alternative approaches with
        evaluation metrics.
      </p>
      <div class="l-stack">
        {files.map((file) => {
          const title =
            file.content.split('\n')[0]?.replace(/^#\s+/, '') || file.filename
          const status = file.frontmatter.status || 'draft'
          return (
            <ContentCard
              key={file.filename}
              title={title}
              href={resolveUrl(`/catalog/experiments/${file.filename}`)}
            >
              <StatusBadge status={status} />
            </ContentCard>
          )
        })}
        {files.length === 0 && (
          <p class="flex-empty">
            No experiments yet. Experiments will be added starting with Slice 2.
          </p>
        )}
      </div>
    </Layout>,
  )
})

experiments.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const filePath = join(process.cwd(), 'catalog', 'experiments', `${slug}.md`)

  const sidebarData = getCatalogSidebar('/catalog/experiments')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  try {
    const file = await parseMarkdown(filePath)
    const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || slug

    return c.html(
      <Layout title={title} sidebar={sidebar} currentPath="/catalog">
        <Prose content={file.content} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href={resolveUrl('/catalog/experiments')}>← Back to Experiments</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found" sidebar={sidebar} currentPath="/catalog">
        <h1>Experiment Not Found</h1>
        <p>
          <a href={resolveUrl('/catalog/experiments')}>← Back to Experiments</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default experiments
