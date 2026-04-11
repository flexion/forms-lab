import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Hono } from 'hono'
import { StatusBadge } from '../../../../design-system/components/flex-badge'
import { Breadcrumb } from '../../../../design-system/components/flex-breadcrumb'
import { ContentCard } from '../../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../../design-system/components/flex-catalog-sidebar'
import { Layout } from '../../../../design-system/components/flex-layout'
import { Prose } from '../../../../design-system/components/flex-prose'
import { TagList } from '../../../../design-system/components/flex-tag-list'
import {
  parseMarkdown,
  readMarkdownDir,
} from '../../../../services/content/markdown'
import { resolveUrl } from '../../../../shared/base-path'
import type { Decision } from '../../../../types/models'
import { getDecisionsSidebar } from './sidebar'

const groupLabels: Record<string, string> = {
  architecture: 'Architecture',
  infrastructure: 'Infrastructure',
  'design-system': 'Design System',
}

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
    <Layout
      title="Decisions"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>Architectural Decisions</h1>
      <p>
        Decisions document what we chose, why, and what alternatives we
        considered. Organized by domain.
      </p>
      <div class="l-stack" style="--stack-space: var(--flex-space-xl)">
        {Object.entries(groups).map(([group, items]) => (
          <section key={group}>
            <p class="catalog-group-label">{groupLabels[group] || group}</p>
            <div class="l-grid" style="--grid-min: 250px">
              {items.map((decision) => (
                <ContentCard
                  key={decision.slug}
                  title={decision.title}
                  href={resolveUrl(
                    `/catalog/decisions/${decision.group}/${decision.slug}`,
                  )}
                >
                  <StatusBadge status={decision.status} />
                </ContentCard>
              ))}
            </div>
          </section>
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
      <Layout
        title={title}
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <Breadcrumb
          items={[
            { label: 'Catalog', href: resolveUrl('/catalog') },
            { label: 'Decisions', href: resolveUrl('/catalog/decisions') },
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
      <Layout
        title="Not Found"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <Breadcrumb
          items={[
            { label: 'Catalog', href: resolveUrl('/catalog') },
            { label: 'Decisions', href: resolveUrl('/catalog/decisions') },
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
