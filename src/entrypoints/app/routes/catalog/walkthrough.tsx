import { join } from 'node:path'
import { Hono } from 'hono'
import { Breadcrumb } from '../../../../design-system/components/flex-breadcrumb'
import { ContentCard } from '../../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../../design-system/components/flex-catalog-sidebar'
import { Layout } from '../../../../design-system/components/flex-layout'
import { PresentLayout } from '../../../../design-system/components/flex-present-layout'
import { Prose } from '../../../../design-system/components/flex-prose'
import { TagList } from '../../../../design-system/components/flex-tag-list'
import { WalkthroughNav } from '../../../../design-system/components/flex-walkthrough-nav'
import {
  readMarkdownDir,
  renderMarkdown,
} from '../../../../services/content/markdown'
import type { WalkthroughPage } from '../../../../services/content/types'
import { resolveUrl } from '../../../../shared/base-path'
import { getWalkthroughSidebar } from './sidebar'

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

  const firstPage = pages[0]

  const isPresent = c.req.query('present') !== undefined

  if (isPresent) {
    const firstUrl = firstPage
      ? resolveUrl(`/catalog/walkthrough/${firstPage.slug}?present`)
      : null

    return c.html(
      <PresentLayout title="Walkthrough">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center">
          <h1 style="font-size:var(--flex-text-3xl);margin-block-end:var(--flex-space-md)">
            Forms Lab
          </h1>
          <p style="font-size:var(--flex-text-xl);color:var(--flex-color-text-muted);margin-block-end:var(--flex-space-xl)">
            LLM-Assisted Forms Platform for Government
          </p>
          {firstUrl && (
            <a href={firstUrl} class="flex-button" data-size="big">
              Begin →
            </a>
          )}
          <p style="font-size:var(--flex-text-sm);color:var(--flex-color-text-muted);margin-block-start:var(--flex-space-lg)">
            Press → or click to begin
          </p>
        </div>
        {firstUrl && (
          <script
            dangerouslySetInnerHTML={{
              __html: `document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();location.href='${firstUrl}'}})`,
            }}
          />
        )}
      </PresentLayout>,
    )
  }

  const sidebarData = getWalkthroughSidebar(pages, '/catalog/walkthrough')
  const sidebar = <CatalogSidebar sections={sidebarData} />

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

walkthrough.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const pages = await loadWalkthroughPages()
  const pageIndex = pages.findIndex((p) => p.slug === slug)

  if (pageIndex === -1) {
    const sidebarData = getWalkthroughSidebar(
      pages,
      `/catalog/walkthrough/${slug}`,
    )
    const sidebar = <CatalogSidebar sections={sidebarData} />
    return c.html(
      <Layout
        title="Not Found"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <h1>Page Not Found</h1>
        <p>The walkthrough page "{slug}" does not exist.</p>
      </Layout>,
      404,
    )
  }

  const page = pages[pageIndex]
  const prevPage = pageIndex > 0 ? pages[pageIndex - 1] : null
  const nextPage = pageIndex < pages.length - 1 ? pages[pageIndex + 1] : null

  const isPresent = c.req.query('present') !== undefined

  if (isPresent) {
    const prevUrl = prevPage
      ? resolveUrl(`/catalog/walkthrough/${prevPage.slug}?present`)
      : null
    const nextUrl = nextPage
      ? resolveUrl(`/catalog/walkthrough/${nextPage.slug}?present`)
      : null

    return c.html(
      <PresentLayout
        title={page.title}
        nav={
          <WalkthroughNav
            currentPage={pageIndex + 1}
            totalPages={pages.length}
            prevUrl={prevUrl}
            nextUrl={nextUrl}
          />
        }
      >
        <Prose html={renderMarkdown(page.content)} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
            var prev=${prevUrl ? `"${prevUrl}"` : 'null'};
            var next=${nextUrl ? `"${nextUrl}"` : 'null'};
            document.addEventListener('keydown',function(e){
              if(e.key==='ArrowRight'||e.key===' '){if(next){e.preventDefault();location.href=next}}
              if(e.key==='ArrowLeft'){if(prev){e.preventDefault();location.href=prev}}
              if(e.key==='Escape'){location.href='${resolveUrl('/catalog/walkthrough')}'}
            });
            document.querySelectorAll('.prose a').forEach(function(a){
              if(!a.getAttribute('href').startsWith('#'))a.setAttribute('target','_blank')
            });
          }())`,
          }}
        />
      </PresentLayout>,
    )
  }

  const sidebarData = getWalkthroughSidebar(
    pages,
    `/catalog/walkthrough/${slug}`,
  )
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout
      title={page.title}
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <Breadcrumb
        items={[
          { label: 'Catalog', href: resolveUrl('/catalog') },
          { label: 'Walkthrough', href: resolveUrl('/catalog/walkthrough') },
          { label: page.title },
        ]}
      />
      <Prose html={renderMarkdown(page.content)} />
      <WalkthroughNav
        currentPage={pageIndex + 1}
        totalPages={pages.length}
        prevUrl={
          prevPage ? resolveUrl(`/catalog/walkthrough/${prevPage.slug}`) : null
        }
        nextUrl={
          nextPage ? resolveUrl(`/catalog/walkthrough/${nextPage.slug}`) : null
        }
      />
    </Layout>,
  )
})

export default walkthrough
