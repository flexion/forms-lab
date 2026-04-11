import { join } from 'node:path'
import { Hono } from 'hono'
import { StatusBadge } from '../../../design-system/components/flex-badge'
import { Breadcrumb } from '../../../design-system/components/flex-breadcrumb'
import { ContentCard } from '../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../design-system/components/flex-catalog-sidebar'
import { Layout } from '../../../design-system/components/flex-layout'
import { Prose } from '../../../design-system/components/flex-prose'
import { TagList } from '../../../design-system/components/flex-tag-list'
import {
  parseMarkdown,
  readMarkdownDir,
} from '../../../services/content/markdown'
import { resolveUrl } from '../../../shared/base-path'
import type { Story } from '../../../types/models'
import { getStoriesSidebar } from './sidebar'

const stories = new Hono()

function parseStory(file: {
  frontmatter: Record<string, string>
  content: string
  filename: string
}): Story {
  const labels =
    file.frontmatter.labels
      ?.replace(/[[\]]/g, '')
      .split(',')
      .map((l: string) => l.trim())
      .filter(Boolean) || []
  return {
    slug: file.filename,
    issue: parseInt(file.frontmatter.issue || '0', 10),
    title: file.frontmatter.title || file.filename,
    milestone: file.frontmatter.milestone || '',
    labels,
    state: file.frontmatter.state || 'open',
    syncedAt: file.frontmatter.synced_at || '',
    content: file.content,
  }
}

stories.get('/', async (c) => {
  const storiesDir = join(process.cwd(), 'catalog', 'stories')
  let files: Awaited<ReturnType<typeof readMarkdownDir>> = []
  try {
    files = await readMarkdownDir(storiesDir)
  } catch {
    // directory may not exist or be empty
  }

  const allStories = files.map(parseStory).sort((a, b) => a.issue - b.issue)

  const sidebarData = getStoriesSidebar(allStories, '/catalog/stories')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout
      title="Stories"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>User Stories</h1>
      <p>
        Stories are synced from{' '}
        <a href="https://github.com/flexion/forms-lab/issues?q=label%3Auser-story">
          GitHub Issues
        </a>
        . Run <code>bun run cli sync-stories</code> to update.
      </p>
      <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
        {allStories.map((story) => (
          <ContentCard
            key={story.slug}
            title={`#${story.issue} ${story.title}`}
            href={resolveUrl(`/catalog/stories/${story.slug}`)}
          >
            <StatusBadge status={story.state} />
            <TagList tags={story.labels.filter((l) => l !== 'user-story')} />
          </ContentCard>
        ))}
        {allStories.length === 0 && (
          <p class="flex-empty">
            No stories synced yet. Run <code>bun run cli sync-stories</code> to
            pull from GitHub.
          </p>
        )}
      </div>
    </Layout>,
  )
})

stories.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const filePath = join(process.cwd(), 'catalog', 'stories', `${slug}.md`)

  // Load all stories for sidebar
  const storiesDir = join(process.cwd(), 'catalog', 'stories')
  let allFiles: Awaited<ReturnType<typeof readMarkdownDir>> = []
  try {
    allFiles = await readMarkdownDir(storiesDir)
  } catch {
    // directory may not exist
  }
  const allStories = allFiles.map(parseStory).sort((a, b) => a.issue - b.issue)

  const sidebarData = getStoriesSidebar(allStories, `/catalog/stories/${slug}`)
  const sidebar = <CatalogSidebar sections={sidebarData} />

  try {
    const file = await parseMarkdown(filePath)
    const story = parseStory({ ...file, filename: slug })

    return c.html(
      <Layout
        title={story.title}
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <Breadcrumb
          items={[
            { label: 'Catalog', href: resolveUrl('/catalog') },
            { label: 'Stories', href: resolveUrl('/catalog/stories') },
            { label: story.title },
          ]}
        />
        <div class="l-cluster">
          <StatusBadge status={story.state} />
          {story.milestone && (
            <span class="badge" data-variant="milestone">
              {story.milestone}
            </span>
          )}
          <TagList tags={story.labels.filter((l) => l !== 'user-story')} />
          {story.issue > 0 && (
            <a
              href={`https://github.com/flexion/forms-lab/issues/${story.issue}`}
              class="u-text-muted"
            >
              GitHub #{story.issue}
            </a>
          )}
        </div>
        <Prose content={story.content} />
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
            { label: 'Stories', href: resolveUrl('/catalog/stories') },
            { label: 'Not Found' },
          ]}
        />
        <h1>Story Not Found</h1>
      </Layout>,
      404,
    )
  }
})

export default stories
