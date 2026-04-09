import { join } from 'node:path'
import { Hono } from 'hono'
import { resolveUrl } from '../../../lib/base-path'
import { parseMarkdown, readMarkdownDir } from '../../../lib/markdown'
import { Breadcrumb } from '../../components/flex-breadcrumb'
import { ContentCard } from '../../components/flex-card'
import { CatalogSidebar } from '../../components/flex-catalog-sidebar'
import { Layout } from '../../components/flex-layout'
import { Prose } from '../../components/flex-prose'
import { getCatalogSidebar } from './sidebar'

const personas = new Hono()

personas.get('/', async (c) => {
  const personasDir = join(process.cwd(), 'catalog', 'personas')
  const files = await readMarkdownDir(personasDir)

  const sidebarData = getCatalogSidebar('/catalog/personas')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout title="Personas" sidebar={sidebar} currentPath="/catalog">
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
            href={resolveUrl(
              `/catalog/personas/${file.frontmatter.id || file.filename}`,
            )}
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

  const sidebarData = getCatalogSidebar('/catalog/personas')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  try {
    const file = await parseMarkdown(filePath)
    const name = file.frontmatter.name || id

    return c.html(
      <Layout title={name} sidebar={sidebar} currentPath="/catalog">
        <Breadcrumb
          items={[
            { label: 'Catalog', href: resolveUrl('/catalog') },
            { label: 'Personas', href: resolveUrl('/catalog/personas') },
            { label: name },
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
            { label: 'Catalog', href: resolveUrl('/catalog') },
            { label: 'Personas', href: resolveUrl('/catalog/personas') },
            { label: 'Not Found' },
          ]}
        />
        <h1>Persona Not Found</h1>
        <p>The persona "{id}" does not exist.</p>
      </Layout>,
      404,
    )
  }
})

export default personas
