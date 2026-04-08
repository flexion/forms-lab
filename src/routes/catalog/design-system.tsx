import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'
import type { ConformanceSpec } from '../../components/conformance-types'
import { StatusBadge } from '../../components/flex-badge'
import { ContentCard } from '../../components/flex-card'
import { CatalogSidebar } from '../../components/flex-catalog-sidebar'
import { Layout } from '../../components/flex-layout'
import { Prose } from '../../components/flex-prose'
import { Table } from '../../components/flex-table'
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

  // Documentation-only catalog pages (not components)
  if (slug === 'typography') {
    const sidebarData = getDesignSystemSidebar(
      '/catalog/design-system/typography',
    )
    const sidebar = <CatalogSidebar sections={sidebarData} />

    return c.html(
      <Layout title="Typography — Design System" sidebar={sidebar}>
        <h1>Typography</h1>

        <section class="l-stack">
          <h2>Font Families</h2>
          <p>
            The design system uses two font families, both self-hosted for
            performance and privacy.
          </p>
          <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
            <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
              <p style="font-family: var(--flex-font-sans); font-size: 1.25rem;">
                Source Sans Pro Web (sans)
              </p>
              <code class="flex-mono">--flex-font-sans</code>
              <p style="font-family: var(--flex-font-sans); margin-top: var(--flex-space-sm);">
                The quick brown fox jumps over the lazy dog. 0123456789
              </p>
            </div>
            <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
              <p style="font-family: var(--flex-font-mono); font-size: 1.25rem;">
                Roboto Mono Web (mono)
              </p>
              <code class="flex-mono">--flex-font-mono</code>
              <p style="font-family: var(--flex-font-mono); margin-top: var(--flex-space-sm);">
                The quick brown fox jumps over the lazy dog. 0123456789
              </p>
            </div>
          </div>
        </section>

        <section class="l-stack">
          <h2>Type Scale</h2>
          <p>
            All font sizes use <code class="flex-mono">--flex-text-*</code>{' '}
            tokens. Components must not use hardcoded px/rem for font sizes
            (exception: USWDS visual conformance).
          </p>
          <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
            {[
              { token: '--flex-text-xs', value: '0.7em', desc: 'Extra small' },
              { token: '--flex-text-sm', value: '0.82em', desc: 'Small' },
              { token: '--flex-text-base', value: '0.9em', desc: 'Base' },
              {
                token: '--flex-text-uswds',
                value: '1.06rem',
                desc: 'USWDS normalized base',
              },
              {
                token: '--flex-text-tag',
                value: '0.875rem',
                desc: 'Tag/badge text',
              },
            ].map((item) => (
              <div
                key={item.token}
                style="display: flex; align-items: baseline; gap: var(--flex-space-md); padding: var(--flex-space-sm) var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);"
              >
                <span
                  style={`font-size: var(${item.token}); min-width: 200px;`}
                >
                  {item.desc}
                </span>
                <code class="flex-mono" style="flex-shrink: 0;">
                  {item.token}: {item.value}
                </code>
              </div>
            ))}
          </div>
        </section>

        <section class="l-stack">
          <h2>Font Weights</h2>
          <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
            <p style="font-weight: 300; font-size: 1.25rem;">
              300 — Light: The quick brown fox jumps over the lazy dog.
            </p>
            <p style="font-weight: 400; font-size: 1.25rem;">
              400 — Regular: The quick brown fox jumps over the lazy dog.
            </p>
            <p style="font-weight: 700; font-size: 1.25rem;">
              700 — Bold: The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </section>

        <section class="l-stack">
          <h2>Line Heights</h2>
          <div class="l-stack" style="--stack-space: var(--flex-space-md);">
            <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
              <p>
                <code class="flex-mono">1.15</code> — HTML default (set on{' '}
                <code class="flex-mono">html</code>)
              </p>
              <p style="line-height: 1.15; background: var(--flex-color-surface); padding: var(--flex-space-sm);">
                This paragraph uses the default HTML line-height of 1.15. It is
                tighter and suitable for UI chrome, navigation, and short labels
                where vertical compactness matters.
              </p>
            </div>
            <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
              <p>
                <code class="flex-mono">1.5</code> — Prose / body text (set on{' '}
                <code class="flex-mono">.prose</code>)
              </p>
              <p style="line-height: 1.5; background: var(--flex-color-surface); padding: var(--flex-space-sm);">
                This paragraph uses the prose line-height of 1.5. It provides
                comfortable reading for longer passages of text, matching USWDS
                guidance for body content and form instructions.
              </p>
            </div>
            <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
              <p>
                <code class="flex-mono">1.3</code> — Headings and controls
              </p>
              <p style="line-height: 1.3; background: var(--flex-color-surface); padding: var(--flex-space-sm); font-size: 1.5rem; font-weight: 700;">
                Headings use 1.3 line-height. This keeps multi-line headings
                visually cohesive without feeling cramped.
              </p>
            </div>
          </div>
        </section>

        <section class="l-stack">
          <h2>Measure</h2>
          <p>
            Reading text is constrained to a maximum width of{' '}
            <code class="flex-mono">68ex</code> (roughly 45-75 characters per
            line), following USWDS measure guidance. This is applied
            automatically in <code class="flex-mono">.prose</code> blocks via{' '}
            <code class="flex-mono">max-width: 68ex</code>.
          </p>
          <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
            <p style="max-width: 68ex; line-height: 1.5; background: var(--flex-color-surface); padding: var(--flex-space-sm);">
              This paragraph is constrained to 68ex max-width, matching the
              USWDS measure for comfortable reading. Research shows that line
              lengths of 45-75 characters optimize reading speed and
              comprehension. Longer lines cause readers to lose their place when
              returning to the left margin.
            </p>
          </div>
        </section>

        <section class="l-stack">
          <h2>Heading Hierarchy</h2>
          <p>
            Prose headings follow USWDS sizing. The design system uses Source
            Sans Pro (not Merriweather) as an intentional difference from USWDS
            defaults.
          </p>
          <div class="l-stack" style="--stack-space: var(--flex-space-md);">
            <div style="padding: var(--flex-space-sm) var(--flex-space-md); border-left: 4px solid var(--flex-color-accent);">
              <p style="font-size: 2.44rem; font-weight: 700; line-height: 1.2;">
                h1 — 2.44rem
              </p>
            </div>
            <div style="padding: var(--flex-space-sm) var(--flex-space-md); border-left: 4px solid var(--flex-color-accent);">
              <p style="font-size: 1.95rem; font-weight: 700; line-height: 1.2;">
                h2 — 1.95rem
              </p>
            </div>
            <div style="padding: var(--flex-space-sm) var(--flex-space-md); border-left: 4px solid var(--flex-color-accent);">
              <p style="font-size: 1.34rem; font-weight: 700; line-height: 1.2;">
                h3 — 1.34rem
              </p>
            </div>
            <div style="padding: var(--flex-space-sm) var(--flex-space-md); border-left: 4px solid var(--flex-color-accent);">
              <p style="font-size: 0.98rem; font-weight: 700; line-height: 1.2;">
                h4 — 0.98rem
              </p>
            </div>
            <div style="padding: var(--flex-space-sm) var(--flex-space-md); border-left: 4px solid var(--flex-color-accent);">
              <p style="font-size: 0.91rem; font-weight: 700; line-height: 1.2;">
                h5 — 0.91rem
              </p>
            </div>
            <div style="padding: var(--flex-space-sm) var(--flex-space-md); border-left: 4px solid var(--flex-color-accent);">
              <p style="font-size: 0.87rem; font-weight: 400; line-height: 1.1; letter-spacing: 0.025em; text-transform: uppercase;">
                h6 — 0.87rem (uppercase, regular weight)
              </p>
            </div>
          </div>
        </section>
      </Layout>,
    )
  }

  if (slug === 'data-visualizations') {
    const sidebarData = getDesignSystemSidebar(
      '/catalog/design-system/data-visualizations',
    )
    const sidebar = <CatalogSidebar sections={sidebarData} />

    return c.html(
      <Layout title="Data Visualizations — Design System" sidebar={sidebar}>
        <h1>Data Visualizations</h1>

        <section class="l-stack">
          <h2>Accessibility First</h2>
          <p>
            Data visualizations — charts, graphs, maps, and infographics — must
            be accessible to all users, including those using screen readers,
            those with low vision, and those with color vision deficiencies. The
            USWDS provides guidance for making visualizations inclusive.
          </p>
        </section>

        <section class="l-stack">
          <h2>Color Usage</h2>
          <p>
            <strong>Never rely on color alone</strong> to convey meaning. Use
            patterns, labels, or other visual indicators alongside color to
            distinguish data series.
          </p>
          <ul>
            <li>
              Pair colors with text labels, patterns (hatching, dots), or
              distinct shapes
            </li>
            <li>
              Use <code class="flex-mono">--flex-color-*</code> semantic tokens
              for consistency with the design system
            </li>
            <li>
              Test visualizations with a color blindness simulator to verify
              they remain readable
            </li>
          </ul>
        </section>

        <section class="l-stack">
          <h2>Alternative Text</h2>
          <p>
            Every chart or graph must have meaningful alternative text. The
            approach depends on the complexity:
          </p>
          <ul>
            <li>
              <strong>Simple charts:</strong> Use a descriptive{' '}
              <code class="flex-mono">alt</code> attribute that conveys the data
              trend or key takeaway
            </li>
            <li>
              <strong>Complex charts:</strong> Provide a data table as a visible
              alternative or in a details/summary disclosure
            </li>
            <li>
              <strong>Interactive visualizations:</strong> Ensure keyboard
              navigation and screen reader announcements for data points
            </li>
          </ul>
        </section>

        <section class="l-stack">
          <h2>Contrast Requirements</h2>
          <p>
            Text and meaningful graphical elements in visualizations must meet
            WCAG contrast requirements:
          </p>
          <ul>
            <li>
              <strong>Text:</strong> 4.5:1 contrast ratio for normal text, 3:1
              for large text
            </li>
            <li>
              <strong>Graphical objects:</strong> 3:1 contrast ratio against
              adjacent colors (axes, data points, lines)
            </li>
            <li>
              <strong>Adjacent data series:</strong> 3:1 contrast ratio between
              neighboring series where distinction matters
            </li>
          </ul>
        </section>

        <section class="l-stack">
          <h2>Further Reading</h2>
          <p>
            For comprehensive guidance, see the{' '}
            <a
              href="https://designsystem.digital.gov/components/data-visualizations/"
              target="_blank"
              rel="noopener noreferrer"
            >
              USWDS Data Visualizations documentation
            </a>
            .
          </p>
        </section>
      </Layout>,
    )
  }

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
              <Table striped>
                <thead>
                  <tr>
                    <th>USWDS</th>
                    <th>Flex</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {conformanceSpec.mapping.map((m) => (
                    <tr>
                      <td>
                        <code class="flex-mono">{m.uswds}</code>
                      </td>
                      <td>
                        <code class="flex-mono">{m.flex}</code>
                      </td>
                      <td>{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
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
