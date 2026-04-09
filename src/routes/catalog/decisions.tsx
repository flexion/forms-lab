import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Hono } from 'hono'
import { StatusBadge } from '../../components/flex-badge'
import { Breadcrumb } from '../../components/flex-breadcrumb'
import { ContentCard } from '../../components/flex-card'
import { CatalogSidebar } from '../../components/flex-catalog-sidebar'
import { Layout } from '../../components/flex-layout'
import { Prose } from '../../components/flex-prose'
import { TagList } from '../../components/flex-tag-list'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'
import type { Decision } from '../../types/models'
import { getDecisionsSidebar } from './sidebar'

const decisions = new Hono()

async function loadDecisions(): Promise<Record<string, Decision[]>> {
  const decisionsDir = join(process.cwd(), 'catalog', 'decisions')
  const groups: Record<string, Decision[]> = {}

  try {
    const entries = await readdir(decisionsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const files = await readMarkdownDir(join(decisionsDir, entry.name))
      groups[entry.name] = files.map((file) => ({
        slug: file.filename,
        group: entry.name,
        title:
          file.content.split('\n')[0]?.replace(/^#\s+/, '') || file.filename,
        status: file.frontmatter.status || 'draft',
        tags:
          file.frontmatter.tags
            ?.split(',')
            .map((t: string) => t.trim().replace(/[[\]]/g, '')) || [],
        decided: file.frontmatter.decided || '',
        content: file.content,
      }))
    }
  } catch {
    // decisions directory may not exist
  }

  return groups
}

decisions.get('/', async (c) => {
  const groups = await loadDecisions()

  const sidebarData = getDecisionsSidebar(groups, '/catalog/decisions')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout title="Decisions" sidebar={sidebar} currentPath="/catalog">
      <h1>Architectural Decisions</h1>
      <p>
        Decisions document what we chose, why, and what alternatives we
        considered. Organized by domain.
      </p>
      <div class="l-stack">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <h2>{group}</h2>
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              {items.map((decision) => (
                <ContentCard
                  key={decision.slug}
                  title={decision.title}
                  href={`/catalog/decisions/${decision.group}/${decision.slug}`}
                >
                  <StatusBadge status={decision.status} />
                  <TagList tags={decision.tags} />
                </ContentCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>,
  )
})

decisions.get('/:group/:slug', async (c) => {
  const { group, slug } = c.req.param()
  const filePath = join(
    process.cwd(),
    'catalog',
    'decisions',
    group,
    `${slug}.md`,
  )

  const groups = await loadDecisions()
  const currentPath = `/catalog/decisions/${group}/${slug}`
  const sidebarData = getDecisionsSidebar(groups, currentPath)
  const sidebar = <CatalogSidebar sections={sidebarData} />

  try {
    const file = await parseMarkdown(filePath)
    const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || slug
    const status = file.frontmatter.status || 'draft'
    const tags =
      file.frontmatter.tags
        ?.split(',')
        .map((t: string) => t.trim().replace(/[[\]]/g, '')) || []
    const decided = file.frontmatter.decided || ''

    return c.html(
      <Layout title={title} sidebar={sidebar} currentPath="/catalog">
        <Breadcrumb
          items={[
            { label: 'Catalog', href: '/catalog' },
            { label: 'Decisions', href: '/catalog/decisions' },
            { label: title },
          ]}
        />
        <div class="l-cluster">
          <StatusBadge status={status} />
          <TagList tags={tags} />
          {decided && <span class="u-text-muted">Decided: {decided}</span>}
        </div>
        <Prose content={file.content} />
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found" sidebar={sidebar} currentPath="/catalog">
        <Breadcrumb
          items={[
            { label: 'Catalog', href: '/catalog' },
            { label: 'Decisions', href: '/catalog/decisions' },
            { label: 'Not Found' },
          ]}
        />
        <h1>Decision Not Found</h1>
      </Layout>,
      404,
    )
  }
})

export default decisions
