import { join } from 'node:path'
import { Hono } from 'hono'
import { ContentCard } from '../../components/flex-card'
import { Layout } from '../../components/flex-layout'
import { Prose } from '../../components/flex-prose'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'

const personas = new Hono()

personas.get('/', async (c) => {
  const personasDir = join(process.cwd(), 'catalog', 'personas')
  const files = await readMarkdownDir(personasDir)

  return c.html(
    <Layout title="Personas">
      <h1>Personas</h1>
      <p>
        Five personas span the full lifecycle of the Forms Lab platform: create
        → fill → operate → build → evaluate.
      </p>
      <div class="l-stack">
        {files.map((file) => (
          <ContentCard
            key={file.filename}
            title={file.frontmatter.name || file.filename}
            href={`/catalog/personas/${file.frontmatter.id || file.filename}`}
            description={file.frontmatter.role || ''}
          />
        ))}
      </div>
    </Layout>,
  )
})

personas.get('/:id', async (c) => {
  const id = c.req.param('id')
  const filePath = join(process.cwd(), 'catalog', 'personas', `${id}.md`)

  try {
    const file = await parseMarkdown(filePath)
    const name = file.frontmatter.name || id

    return c.html(
      <Layout title={name}>
        <Prose content={file.content} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href="/catalog/personas">← Back to Personas</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found">
        <h1>Persona Not Found</h1>
        <p>The persona "{id}" does not exist.</p>
        <p>
          <a href="/catalog/personas">← Back to Personas</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default personas
