import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'
import type { ConformanceSpec } from '../../components/conformance-types'
import { StatusBadge } from '../../components/flex-badge'
import { ContentCard } from '../../components/flex-card'
import { CatalogSidebar } from '../../components/flex-catalog-sidebar'
import { Layout } from '../../components/flex-layout'
import { Prose } from '../../components/flex-prose'
import {
  getComponentBySlug,
  getComponentsByCategory,
} from '../../components/registry'
import { getDesignSystemSidebar } from './sidebar'

const designSystem = new Hono()

designSystem.get('/', (c) => {
  const sidebarData = getDesignSystemSidebar('/catalog/design-system')
  const sidebar = <CatalogSidebar sections={sidebarData} />
  const grouped = getComponentsByCategory()

  return c.html(
    <Layout title="Design System" sidebar={sidebar}>
      <h1>Design System</h1>

      <section class="l-stack">
        <h2>Components</h2>
        {Object.entries(grouped).map(([category, components]) => (
          <div class="l-stack">
            <h3 style="text-transform: capitalize;">{category}</h3>
            <div class="l-grid" style="--grid-min: 250px;">
              {components.map((comp) => (
                <ContentCard
                  title={comp.name}
                  href={`/catalog/design-system/${comp.slug}`}
                  description={comp.description}
                >
                  <StatusBadge
                    status={comp.category === 'action' ? 'stable' : 'working'}
                  />
                </ContentCard>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section class="l-stack">
        <h2>Tokens</h2>
        <p>
          Two-tier token architecture: immutable USWDS 3.13 palette tokens (
          <code>--flex-blue-60</code>) and semantic role-based tokens (
          <code>--flex-color-accent</code>). Components use semantic tokens
          only. Retheme by remapping semantic tokens.
        </p>

        <h3>Colors</h3>
        <div class="l-grid" style="--grid-min: 150px;">
          <div style="padding: var(--flex-space-md); background: var(--flex-color-bg); border: 1px solid var(--flex-color-border);">
            <code class="flex-mono">--flex-color-bg</code>
          </div>
          <div style="padding: var(--flex-space-md); background: var(--flex-color-surface); border: 1px solid var(--flex-color-border);">
            <code class="flex-mono">--flex-color-surface</code>
          </div>
          <div style="padding: var(--flex-space-md); background: var(--flex-color-accent); color: var(--flex-color-on-accent);">
            <code class="flex-mono">--flex-color-accent</code>
          </div>
          <div style="padding: var(--flex-space-md); background: var(--flex-color-success-lighter);">
            <code class="flex-mono">--flex-color-success</code>
          </div>
          <div style="padding: var(--flex-space-md); background: var(--flex-color-error-lighter);">
            <code class="flex-mono">--flex-color-error</code>
          </div>
          <div style="padding: var(--flex-space-md); background: var(--flex-color-warning-lighter);">
            <code class="flex-mono">--flex-color-warning</code>
          </div>
          <div style="padding: var(--flex-space-md); background: var(--flex-color-info-lighter);">
            <code class="flex-mono">--flex-color-info</code>
          </div>
        </div>

        <h3>Spacing</h3>
        <div class="l-stack" style="--stack-space: var(--flex-space-xs);">
          <div class="l-cluster">
            <code class="flex-mono">--flex-space-xs (4px)</code>
            <div style="width: var(--flex-space-xs); height: var(--flex-space-md); background: var(--flex-color-accent);"></div>
          </div>
          <div class="l-cluster">
            <code class="flex-mono">--flex-space-sm (8px)</code>
            <div style="width: var(--flex-space-sm); height: var(--flex-space-md); background: var(--flex-color-accent);"></div>
          </div>
          <div class="l-cluster">
            <code class="flex-mono">--flex-space-md (16px)</code>
            <div style="width: var(--flex-space-md); height: var(--flex-space-md); background: var(--flex-color-accent);"></div>
          </div>
          <div class="l-cluster">
            <code class="flex-mono">--flex-space-lg (24px)</code>
            <div style="width: var(--flex-space-lg); height: var(--flex-space-md); background: var(--flex-color-accent);"></div>
          </div>
          <div class="l-cluster">
            <code class="flex-mono">--flex-space-xl (32px)</code>
            <div style="width: var(--flex-space-xl); height: var(--flex-space-md); background: var(--flex-color-accent);"></div>
          </div>
        </div>
      </section>

      <section class="l-stack">
        <h2>Compositions</h2>
        <p>
          Layout primitives from CUBE CSS. Compositions handle spatial
          relationships only — no colors, typography, or borders.
        </p>

        <h3>l-stack</h3>
        <p>
          Vertical flow with consistent spacing. Customizable via{' '}
          <code>--stack-space</code>.
        </p>

        <h3>l-cluster</h3>
        <p>
          Horizontal wrapping group with gap. Customizable via{' '}
          <code>--cluster-space</code>.
        </p>

        <h3>l-center</h3>
        <p>Centered content column, max-width 960px.</p>

        <h3>l-sidebar</h3>
        <p>
          Two-column layout: sidebar + main content. Used for the catalog
          navigation.
        </p>

        <h3>l-grid</h3>
        <p>
          Auto-fill responsive grid. Customizable via <code>--grid-min</code>.
        </p>
      </section>

      <section class="l-stack">
        <h2>Rules</h2>
        <Prose
          content={
            '### Token Rules\n\n- All colors must use `--flex-color-*` tokens (no hardcoded hex)\n- Spacing must use `--flex-space-*` tokens\n- Font families must use `--flex-font-sans` or `--flex-font-mono`\n- Font sizes must use `--flex-text-*` tokens\n- Border radii must use `--flex-radius-*` tokens\n- Exception: USWDS components may use hardcoded rem/px for visual conformance\n\n### Component Rules\n\n- One CSS file per component, co-located with its TSX\n- Block CSS handles appearance (color, typography, borders), not layout between siblings\n- Use `data-` attributes for state/variants (`data-status`, `data-variant`, `data-size`)\n- Every interactive component must have `:focus-visible` and `:disabled` styles\n\n### Accessibility\n\n- 44px minimum touch target\n- Form fields must have associated `<label>`\n- Error states need color + text (not color alone)\n- Respect `prefers-reduced-motion`\n- Support `prefers-contrast`'
          }
        />
      </section>
    </Layout>,
  )
})

designSystem.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const meta = getComponentBySlug(slug)

  if (!meta) {
    return c.notFound()
  }

  const sidebarData = getDesignSystemSidebar(`/catalog/design-system/${slug}`)
  const sidebar = <CatalogSidebar sections={sidebarData} />

  // Dynamic import of examples — each export is a component function
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import module shape
  type ExampleFn = () => any
  let exampleEntries: [string, ExampleFn][] = []
  try {
    const examples = await import(`../../components/${meta.slug}/examples.tsx`)
    exampleEntries = Object.entries(examples).filter(
      ([key]) => key !== 'default',
    ) as [string, ExampleFn][]
  } catch {
    // No examples file for this component
  }

  // Read CSS source
  let cssSource = ''
  try {
    cssSource = readFileSync(
      join(process.cwd(), 'src', 'components', meta.slug, 'styles.css'),
      'utf-8',
    )
  } catch {
    // No styles.css for this component
  }

  // Load conformance spec
  let conformanceSpec: ConformanceSpec | null = null
  try {
    const specModule = await import(
      `../../components/${meta.slug}/conformance-spec.ts`
    )
    conformanceSpec = specModule.spec
  } catch {
    // No conformance spec for this component
  }

  return c.html(
    <Layout title={`${meta.name} — Design System`} sidebar={sidebar}>
      <h1>{meta.name}</h1>

      <div class="l-cluster">
        <span class="badge" data-variant="milestone">
          {meta.category}
        </span>
        {meta.interactive && (
          <span class="badge" data-state="open">
            interactive
          </span>
        )}
      </div>

      <p>{meta.description}</p>

      <p>
        <a href={meta.uswds} target="_blank" rel="noopener noreferrer">
          USWDS Documentation ↗
        </a>
      </p>

      {exampleEntries.length > 0 && (
        <section class="l-stack">
          <h2>Examples</h2>
          {exampleEntries.map(([name, ExampleFn]) => (
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              <h3>{name}</h3>
              <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
                <ExampleFn />
              </div>
            </div>
          ))}
        </section>
      )}

      {conformanceSpec && (
        <section class="l-stack">
          <h2>Conformance</h2>

          {conformanceSpec.mapping.length > 0 && (
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              <h3>Class Mapping</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--flex-color-border);">
                    <th style="text-align: left; padding: var(--flex-space-xs) var(--flex-space-sm);">
                      USWDS
                    </th>
                    <th style="text-align: left; padding: var(--flex-space-xs) var(--flex-space-sm);">
                      Flex
                    </th>
                    <th style="text-align: left; padding: var(--flex-space-xs) var(--flex-space-sm);">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {conformanceSpec.mapping.map((m) => (
                    <tr style="border-bottom: 1px solid var(--flex-color-border);">
                      <td style="padding: var(--flex-space-xs) var(--flex-space-sm);">
                        <code class="flex-mono">{m.uswds}</code>
                      </td>
                      <td style="padding: var(--flex-space-xs) var(--flex-space-sm);">
                        <code class="flex-mono">{m.flex}</code>
                      </td>
                      <td style="padding: var(--flex-space-xs) var(--flex-space-sm);">
                        {m.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {conformanceSpec.verified.length > 0 && (
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              <h3>Verified Properties</h3>
              <div class="l-cluster">
                {conformanceSpec.verified.map((prop) => (
                  <code
                    class="flex-mono"
                    style="padding: 2px var(--flex-space-xs); background: var(--flex-color-success-lighter); border-radius: var(--flex-radius-sm);"
                  >
                    {prop}
                  </code>
                ))}
              </div>
            </div>
          )}

          {conformanceSpec.intentionalDifferences.length > 0 && (
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              <h3>Intentional Differences</h3>
              {conformanceSpec.intentionalDifferences.map((d) => (
                <div style="padding: var(--flex-space-sm); background: var(--flex-color-warning-lighter); border-radius: var(--flex-radius-md);">
                  <p>
                    <strong>
                      <code class="flex-mono">{d.property}</code>
                    </strong>
                    : ours = <code class="flex-mono">{d.ours}</code>, USWDS ={' '}
                    <code class="flex-mono">{d.uswds}</code>
                  </p>
                  <p>{d.reason}</p>
                </div>
              ))}
            </div>
          )}

          {conformanceSpec.behavior.length > 0 && (
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              <h3>Behavior</h3>
              <ul>
                {conformanceSpec.behavior.map((b) => (
                  <li>
                    {b.tested ? '✓' : '○'} {b.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {cssSource && (
        <section class="l-stack">
          <h2>Source CSS</h2>
          <pre style="overflow-x: auto; padding: var(--flex-space-md); background: var(--flex-color-surface); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
            <code>{cssSource}</code>
          </pre>
        </section>
      )}
    </Layout>,
  )
})

export default designSystem
