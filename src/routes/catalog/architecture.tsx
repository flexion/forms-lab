import { join } from 'node:path'
import { Hono } from 'hono'
import { ContentCard } from '../../components/flex-card'
import { Layout } from '../../components/flex-layout'
import { Prose } from '../../components/flex-prose'
import { StatusBadge } from '../../components/flex-badge'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'

const architecture = new Hono()

architecture.get('/', async (c) => {
  const archDir = join(process.cwd(), 'catalog', 'architecture')
  let files: Awaited<ReturnType<typeof readMarkdownDir>> = []
  try {
    files = await readMarkdownDir(archDir)
  } catch {
    // directory may not exist
  }

  return c.html(
    <Layout title="Architecture">
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

  try {
    const file = await parseMarkdown(filePath)
    const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || slug

    return c.html(
      <Layout title={title}>
        <Prose content={file.content} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href="/catalog/architecture">← Back to Architecture</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found">
        <h1>Document Not Found</h1>
        <p>
          <a href="/catalog/architecture">← Back to Architecture</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default architecture
