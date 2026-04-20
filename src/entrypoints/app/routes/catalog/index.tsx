import { join } from 'node:path'
import { Hono } from 'hono'
import { ContentCard } from '../../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../../design-system/components/flex-catalog-sidebar'
import { Layout } from '../../../../design-system/components/flex-layout'
import { SummaryBox } from '../../../../design-system/components/flex-summary-box'
import { readMarkdownDir } from '../../../../services/content'
import { resolveUrl } from '../../../../shared/base-path'
import architecture from './architecture'
import decisions from './decisions'
import designSystem from './design-system'
import experiments from './experiments'
import personas from './personas'
import { getCatalogSidebar } from './sidebar'
import stories from './stories'
import walkthrough from './walkthrough'

const catalog = new Hono()

// Mount sub-routes
catalog.route('/personas', personas)
catalog.route('/decisions', decisions)
catalog.route('/architecture', architecture)
catalog.route('/stories', stories)
catalog.route('/experiments', experiments)
catalog.route('/design-system', designSystem)
catalog.route('/walkthrough', walkthrough)

// Catalog landing page
catalog.get('/', async (c) => {
  const catalogDir = join(process.cwd(), 'catalog')

  // Count decisions across subdirectories
  const { readdir } = await import('node:fs/promises')
  let decisionCount = 0
  try {
    const groups = await readdir(join(catalogDir, 'decisions'), {
      withFileTypes: true,
    })
    for (const group of groups) {
      if (group.isDirectory()) {
        const files = await readMarkdownDir(
          join(catalogDir, 'decisions', group.name),
        )
        decisionCount += files.length
      }
    }
  } catch {
    // decisions directory may not exist yet
  }

  const sidebarData = getCatalogSidebar('/catalog')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout
      title="Catalog"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>Catalog</h1>
      <p>
        An LLM-assisted forms platform for government forms. Data flows from
        collection specs through form definitions to submissions.
      </p>

      <div class="l-stack" style="--stack-space: var(--flex-space-xl)">
        <SummaryBox heading="Headline finding">
          <p>
            The{' '}
            <a
              href={resolveUrl(
                '/catalog/experiments/pdf-field-extraction/sonnet-hybrid-v1',
              )}
            >
              <strong>hybrid-v1</strong> extraction variant
            </a>{' '}
            (one instruction, one exemplar, temperature=0) Pareto-dominates
            every other prompt-only variant on the PDF field extraction suite —
            precision 99.2%, recall 72.6%, sensitivity +23.8pp over baseline —
            and is the production default. Same prompt shape that topped the
            Assignment 10 tool-calling leaderboard; the rank ordering reproduces
            across model scale and task type. See the{' '}
            <a href={resolveUrl('/catalog/experiments/pdf-field-extraction')}>
              extraction suite
            </a>{' '}
            for the full comparison.
          </p>
        </SummaryBox>

        <section>
          <p class="catalog-group-label">Presentation</p>
          <div class="l-grid" style="--grid-min: 280px">
            <ContentCard
              title="Slide Deck"
              href={resolveUrl('/presentation')}
              description="15-minute live presentation — narrative arc, key findings, and demo"
            />
            <ContentCard
              title="Walkthrough"
              href={resolveUrl('/catalog/walkthrough')}
              description="Guided tour of the project — problem, approach, LLM integration, and demo"
            />
          </div>
        </section>

        <section>
          <p class="catalog-group-label">Experiment suites</p>
          <div class="l-grid" style="--grid-min: 280px">
            <ContentCard
              title="PDF field extraction"
              href={resolveUrl('/catalog/experiments/pdf-field-extraction')}
              description="Nine variants compared on recall, precision, sensitivity. Hybrid-v1 is the current default."
            />
            <ContentCard
              title="Shaping model comparison"
              href={resolveUrl('/catalog/experiments/shaping-model-comparison')}
              description="Haiku vs Sonnet vs Opus on conversational shaping commands. Prompt disambiguation, not model size, is the bottleneck."
            />
            <ContentCard
              title="Authoring pipeline"
              href={resolveUrl('/catalog/experiments/authoring-pipeline/index')}
              description="RAG-assisted spec authoring — corpus ingestion, grounded extraction, citation rendering."
            />
          </div>
        </section>

        <section>
          <p class="catalog-group-label">The System</p>
          <div class="l-grid" style="--grid-min: 280px">
            <ContentCard
              title="Architecture"
              href={resolveUrl('/catalog/architecture')}
              description="System overview, data model, deployment, threat model"
            />
            <ContentCard
              title="Decisions"
              href={resolveUrl('/catalog/decisions')}
              description={`${decisionCount} decisions across architecture, infrastructure, design`}
            />
          </div>
        </section>

        <section>
          <p class="catalog-group-label">The Work</p>
          <div class="l-grid" style="--grid-min: 200px">
            <ContentCard
              title="Personas"
              href={resolveUrl('/catalog/personas')}
              description="Who the system serves"
            />
            <ContentCard
              title="Stories"
              href={resolveUrl('/catalog/stories')}
              description="What's being built"
            />
            <ContentCard
              title="Experiments"
              href={resolveUrl('/catalog/experiments')}
              description="What we're exploring"
            />
          </div>
        </section>

        <section>
          <p class="catalog-group-label">The Craft</p>
          <div class="l-grid">
            <ContentCard
              title="Design System"
              href={resolveUrl('/catalog/design-system')}
              description="Tokens, components, compositions, and visual language"
            />
          </div>
        </section>
      </div>
    </Layout>,
  )
})

export default catalog
