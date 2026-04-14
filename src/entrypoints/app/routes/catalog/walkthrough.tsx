import { join } from 'node:path'
import { Hono } from 'hono'
import { ContentCard } from '../../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../../design-system/components/flex-catalog-sidebar'
import { Layout } from '../../../../design-system/components/flex-layout'
import { TagList } from '../../../../design-system/components/flex-tag-list'
import { readMarkdownDir } from '../../../../services/content/markdown'
import type { WalkthroughPage } from '../../../../services/content/types'
import { resolveUrl } from '../../../../shared/base-path'
import { getCatalogSidebar } from './sidebar'

const walkthrough = new Hono()

function parseArrayField(value: string | undefined): string[] {
  if (!value) return []
  return value
    .replace(/[[\]]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseWalkthroughPage(file: {
  frontmatter: Record<string, string>
  content: string
  filename: string
}): WalkthroughPage {
  return {
    slug: file.filename,
    title: file.frontmatter.title || file.filename,
    order: parseInt(file.frontmatter.order || '0', 10),
    rubric: parseArrayField(file.frontmatter.rubric),
    timing: file.frontmatter.timing || '',
    audience: parseArrayField(file.frontmatter.audience),
    content: file.content,
  }
}

async function loadWalkthroughPages(): Promise<WalkthroughPage[]> {
  const dir = join(process.cwd(), 'catalog', 'walkthrough')
  const files = await readMarkdownDir(dir)
  return files.map(parseWalkthroughPage).sort((a, b) => a.order - b.order)
}

const RUBRIC_AREAS = [
  'model-functionality',
  'innovation',
  'environment-setup',
  'inference-pipeline',
  'technical-documentation',
  'demo-presentation',
] as const

walkthrough.get('/', async (c) => {
  const pages = await loadWalkthroughPages()

  const coveredAreas = new Set(pages.flatMap((p) => p.rubric))
  const totalMinutes = pages.reduce((sum, p) => {
    const match = p.timing.match(/(\d+)/)
    return sum + (match ? parseInt(match[1], 10) : 0)
  }, 0)

  const sidebarData = getCatalogSidebar('/catalog/walkthrough')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  const firstPage = pages[0]

  return c.html(
    <Layout
      title="Walkthrough"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>Project Walkthrough</h1>
      <p>
        A guided tour of the Forms Lab project — problem, approach, LLM
        integration, production environment, and live demo.
        {totalMinutes > 0 && <> Estimated time: {totalMinutes} minutes.</>}
      </p>

      {firstPage && (
        <p>
          <a
            href={resolveUrl(`/catalog/walkthrough/${firstPage.slug}`)}
            class="flex-button"
          >
            Start walkthrough
          </a>
        </p>
      )}

      <section>
        <h2>Rubric Coverage</h2>
        <div class="l-cluster">
          {RUBRIC_AREAS.map((area) => (
            <span
              key={area}
              class="badge"
              data-status={coveredAreas.has(area) ? 'closed' : 'open'}
            >
              {area}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2>Sections</h2>
        <div class="l-stack">
          {pages.map((page, i) => (
            <ContentCard
              key={page.slug}
              title={`${i + 1}. ${page.title}`}
              href={resolveUrl(`/catalog/walkthrough/${page.slug}`)}
              description={page.timing ? `${page.timing}` : undefined}
            >
              <TagList tags={page.rubric} />
            </ContentCard>
          ))}
        </div>
      </section>
    </Layout>,
  )
})

export default walkthrough
