import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Hono } from 'hono'
import { StatusBadge } from '../../../../design-system/components/flex-badge'
import { ContentCard } from '../../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../../design-system/components/flex-catalog-sidebar'
import { Layout } from '../../../../design-system/components/flex-layout'
import { Prose } from '../../../../design-system/components/flex-prose'
import {
  parseMarkdown,
  readMarkdownDir,
  renderMarkdown,
} from '../../../../services/content/markdown'
import { resolveUrl } from '../../../../shared/base-path'
import { getCatalogSidebar } from './sidebar'

const experiments = new Hono()

// Index: List evaluation kinds (subdirectories) and top-level files
experiments.get('/', async (c) => {
  const expDir = join(process.cwd(), 'catalog', 'experiments')
  let kinds: string[] = []
  let files: Awaited<ReturnType<typeof readMarkdownDir>> = []

  try {
    const entries = await readdir(expDir, { withFileTypes: true })
    kinds = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
    files = await readMarkdownDir(expDir)
  } catch {
    // directory may not exist
  }

  const sidebarData = getCatalogSidebar('/catalog/experiments')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout
      title="Experiments"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>Experiments</h1>
      <p>
        LLM experiments comparing baseline and alternative approaches with
        evaluation metrics.
      </p>
      <div class="l-stack">
        {kinds.map((kind) => {
          return (
            <ContentCard
              key={kind}
              title={kind
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}
              href={resolveUrl(`/catalog/experiments/${kind}`)}
            >
              <StatusBadge status="working" />
            </ContentCard>
          )
        })}
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
        {kinds.length === 0 && files.length === 0 && (
          <p class="flex-empty">
            No experiments yet. Experiments will be added starting with Slice 2.
          </p>
        )}
      </div>
    </Layout>,
  )
})

// Kind page: Show suite description and list runs
experiments.get('/:kind', async (c) => {
  const kind = c.req.param('kind')
  const kindDir = join(process.cwd(), 'catalog', 'experiments', kind)
  const suiteFilePath = join(kindDir, '_suite.md')

  const sidebarData = getCatalogSidebar('/catalog/experiments')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  try {
    // Check if this is a directory with a suite description
    const entries = await readdir(kindDir, { withFileTypes: true })
    const isDirectory = entries.length > 0

    if (!isDirectory) {
      // Fall back to treating as a single markdown file
      const filePath = join(
        process.cwd(),
        'catalog',
        'experiments',
        `${kind}.md`,
      )
      const file = await parseMarkdown(filePath)
      const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || kind

      return c.html(
        <Layout
          title={title}
          sidebar={sidebar}
          currentPath="/catalog"
          user={c.get('user')}
        >
          <Prose content={file.content} />
          <p style="margin-top: var(--flex-space-lg);">
            <a href={resolveUrl('/catalog/experiments')}>
              ← Back to Experiments
            </a>
          </p>
        </Layout>,
      )
    }

    // Read suite description
    const suite = await parseMarkdown(suiteFilePath)
    const title = suite.content.split('\n')[0]?.replace(/^#\s+/, '') || kind

    // Read runs (markdown files, excluding _suite.md)
    const runs = entries
      .filter(
        (e) => e.isFile() && e.name.endsWith('.md') && !e.name.startsWith('_'),
      )
      .map((e) => e.name.replace('.md', ''))

    // Read JSON sidecar files for comparison data
    interface RunSummary {
      strategy: string
      metrics: Record<string, number>
    }
    const runSummaries: RunSummary[] = []

    for (const run of runs) {
      try {
        const jsonPath = join(kindDir, `${run}.json`)
        const jsonContent = await Bun.file(jsonPath).text()
        const data = JSON.parse(jsonContent)
        if (data.summary) {
          runSummaries.push({
            strategy: run,
            metrics: data.summary,
          })
        }
      } catch {
        // No JSON sidecar or parse error
      }
    }

    return c.html(
      <Layout
        title={title}
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <Prose content={suite.content} />

        {runSummaries.length > 0 && (
          <>
            <h2 style="margin-top: var(--flex-space-xl);">
              Results Comparison
            </h2>
            <div style="overflow-x: auto;">
              <table class="flex-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    {Object.keys(runSummaries[0].metrics).map((metric) => (
                      <th key={metric}>{metric}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runSummaries.map((run) => (
                    <tr key={run.strategy}>
                      <td>
                        <a
                          href={resolveUrl(
                            `/catalog/experiments/${kind}/${run.strategy}`,
                          )}
                        >
                          {run.strategy}
                        </a>
                      </td>
                      {Object.values(run.metrics).map((value, idx) => (
                        <td key={idx}>
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {runs.length > 0 && runSummaries.length === 0 && (
          <>
            <h2 style="margin-top: var(--flex-space-xl);">Runs</h2>
            <div class="l-stack">
              {runs.map((run) => (
                <ContentCard
                  key={run}
                  title={run}
                  href={resolveUrl(`/catalog/experiments/${kind}/${run}`)}
                />
              ))}
            </div>
          </>
        )}

        <p style="margin-top: var(--flex-space-lg);">
          <a href={resolveUrl('/catalog/experiments')}>← Back to Experiments</a>
        </p>
      </Layout>,
    )
  } catch {
    // Try treating as a top-level markdown file
    try {
      const filePath = join(
        process.cwd(),
        'catalog',
        'experiments',
        `${kind}.md`,
      )
      const file = await parseMarkdown(filePath)
      const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || kind

      return c.html(
        <Layout
          title={title}
          sidebar={sidebar}
          currentPath="/catalog"
          user={c.get('user')}
        >
          <Prose content={file.content} />
          <p style="margin-top: var(--flex-space-lg);">
            <a href={resolveUrl('/catalog/experiments')}>
              ← Back to Experiments
            </a>
          </p>
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
          <h1>Experiment Not Found</h1>
          <p>
            <a href={resolveUrl('/catalog/experiments')}>
              ← Back to Experiments
            </a>
          </p>
        </Layout>,
        404,
      )
    }
  }
})

// Run page: Show individual run details
experiments.get('/:kind/:slug', async (c) => {
  const kind = c.req.param('kind')
  const slug = c.req.param('slug')
  const filePath = join(
    process.cwd(),
    'catalog',
    'experiments',
    kind,
    `${slug}.md`,
  )

  const sidebarData = getCatalogSidebar('/catalog/experiments')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  try {
    const file = await parseMarkdown(filePath)
    const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || slug

    return c.html(
      <Layout
        title={title}
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <Prose html={renderMarkdown(file.content)} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href={resolveUrl(`/catalog/experiments/${kind}`)}>
            ← Back to {kind}
          </a>
        </p>
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
        <h1>Run Not Found</h1>
        <p>
          <a href={resolveUrl(`/catalog/experiments/${kind}`)}>
            ← Back to {kind}
          </a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default experiments
