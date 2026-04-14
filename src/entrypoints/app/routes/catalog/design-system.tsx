import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import hljs from 'highlight.js/lib/core'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import { Hono } from 'hono'
import { Accordion } from '../../../../design-system/components/flex-accordion'
import {
  Tab,
  TabGroup,
} from '../../../../design-system/components/flex-tab-group'
import { resolveUrl } from '../../../../shared/base-path'
import { formatHtml } from '../../../../shared/format-html'

hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)

import { StatusBadge } from '../../../../design-system/components/flex-badge'
import { ContentCard } from '../../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../../design-system/components/flex-catalog-sidebar'
import { Layout } from '../../../../design-system/components/flex-layout'
import { Prose } from '../../../../design-system/components/flex-prose'
import { Table } from '../../../../design-system/components/flex-table'
import type { ConformanceSpec } from '../../../../design-system/conformance/types'
import {
  getComponentBySlug,
  getComponentsByCategory,
} from '../../../../design-system/registry'
import { renderMarkdown } from '../../../../services/content/markdown'
import { getDesignSystemSidebar } from './sidebar'

const designSystem = new Hono()

// Minimal syntax highlighting theme using design tokens
const hljsStyles = `
.hljs { color: var(--flex-color-text); }
.hljs-selector-class, .hljs-selector-id, .hljs-selector-tag { color: var(--flex-blue-vivid-60); }
.hljs-attribute, .hljs-keyword, .hljs-selector-pseudo { color: var(--flex-red-warm-vivid-50); }
.hljs-string, .hljs-number { color: var(--flex-green-cool-vivid-40); }
.hljs-comment { color: var(--flex-color-text-muted); font-style: italic; }
.hljs-built_in, .hljs-function { color: var(--flex-violet-vivid-70); }
.hljs-tag { color: var(--flex-blue-vivid-60); }
.hljs-name { color: var(--flex-blue-vivid-60); }
.hljs-attr { color: var(--flex-red-warm-vivid-50); }
`

designSystem.get('/', (c) => {
  const sidebarData = getDesignSystemSidebar('/catalog/design-system')
  const sidebar = <CatalogSidebar sections={sidebarData} />
  const grouped = getComponentsByCategory()

  // Category display names
  const categoryLabels: Record<string, string> = {
    form: 'Form Controls',
    action: 'Actions',
    feedback: 'Feedback',
    navigation: 'Navigation',
    layout: 'Layout',
    process: 'Process',
    identity: 'Identity',
  }

  const foundations = [
    {
      title: 'Tokens',
      href: resolveUrl('/catalog/design-system/tokens'),
      description:
        'Two-tier token architecture: USWDS palette tokens and semantic role-based tokens.',
    },
    {
      title: 'Typography',
      href: resolveUrl('/catalog/design-system/typography'),
      description:
        'Font families, type scale, weights, line heights, measure, and heading hierarchy.',
    },
    {
      title: 'Compositions',
      href: resolveUrl('/catalog/design-system/compositions'),
      description:
        'Layout primitives from CUBE CSS: stack, cluster, center, sidebar, grid.',
    },
    {
      title: 'Base Classes',
      href: resolveUrl('/catalog/design-system/base-classes'),
      description: 'Shared CSS properties extracted into multi-selector rules.',
    },
    {
      title: 'Rules',
      href: resolveUrl('/catalog/design-system/rules'),
      description:
        'Token rules, component rules, and accessibility invariants.',
    },
    {
      title: 'Data Visualizations',
      href: resolveUrl('/catalog/design-system/data-visualizations'),
      description:
        'Accessibility-first guidance for charts, graphs, maps, and infographics.',
    },
    {
      title: 'Layout',
      href: resolveUrl('/catalog/design-system/layout'),
      description:
        'Page layouts (content, sidebar-start, sidebar-end), breakout tracks, and container contracts that guide layouts toward correctness by default.',
    },
  ]

  return c.html(
    <Layout title="Design System" sidebar={sidebar} currentPath="/catalog">
      <h1>Design System</h1>
      <p>
        A USWDS-aligned design system built with CUBE CSS methodology. Semantic
        tokens, layout compositions, and accessible components.
      </p>

      <div class="l-stack" style="--stack-space: var(--flex-space-xl)">
        <section>
          <p class="catalog-group-label">Foundations</p>
          <div class="l-grid" style="--grid-min: 250px;">
            {foundations.map((item) => (
              <ContentCard
                title={item.title}
                href={item.href}
                description={item.description}
              />
            ))}
          </div>
        </section>

        {Object.entries(grouped).map(([category, components]) => (
          <section>
            <p class="catalog-group-label">
              {categoryLabels[category] || category}
            </p>
            <div class="l-grid" style="--grid-min: 250px;">
              {components.map((comp) => (
                <ContentCard
                  title={comp.name}
                  href={resolveUrl(`/catalog/design-system/${comp.slug}`)}
                  description={comp.description}
                >
                  <StatusBadge
                    status={comp.category === 'action' ? 'stable' : 'working'}
                  />
                </ContentCard>
              ))}
            </div>
          </section>
        ))}
      </div>
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
      <Layout
        title="Typography — Design System"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
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

  if (slug === 'tokens') {
    const sidebarData = getDesignSystemSidebar('/catalog/design-system/tokens')
    const sidebar = <CatalogSidebar sections={sidebarData} />

    return c.html(
      <Layout
        title="Tokens — Design System"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <h1>Tokens</h1>

        <section class="l-stack">
          <p>
            Two-tier token architecture: immutable USWDS 3.13 palette tokens (
            <code>--flex-blue-60</code>) and semantic role-based tokens (
            <code>--flex-color-accent</code>). Components use semantic tokens
            only. Retheme by remapping semantic tokens.
          </p>

          <h2>Colors</h2>
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

          <h2>Spacing</h2>
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
      </Layout>,
    )
  }

  if (slug === 'compositions') {
    const sidebarData = getDesignSystemSidebar(
      '/catalog/design-system/compositions',
    )
    const sidebar = <CatalogSidebar sections={sidebarData} />

    return c.html(
      <Layout
        title="Compositions — Design System"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <h1>Compositions</h1>

        <section class="l-stack">
          <p>
            Layout primitives from CUBE CSS. Compositions handle spatial
            relationships only — no colors, typography, or borders.
          </p>

          <h2>l-stack</h2>
          <p>
            Vertical flow with consistent spacing. Customizable via{' '}
            <code>--stack-space</code>.
          </p>

          <h2>l-cluster</h2>
          <p>
            Horizontal wrapping group with gap. Customizable via{' '}
            <code>--cluster-space</code>.
          </p>

          <h2>l-center</h2>
          <p>Centered content column, max-width 960px.</p>

          <h2>l-sidebar</h2>
          <p>
            Two-column layout: sidebar + main content. Used for the catalog
            navigation.
          </p>

          <h2>l-grid</h2>
          <p>
            Auto-fill responsive grid. Customizable via <code>--grid-min</code>.
          </p>
        </section>
      </Layout>,
    )
  }

  if (slug === 'rules') {
    const sidebarData = getDesignSystemSidebar('/catalog/design-system/rules')
    const sidebar = <CatalogSidebar sections={sidebarData} />

    return c.html(
      <Layout
        title="Rules — Design System"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <h1>Rules</h1>

        <section class="l-stack">
          <Prose
            html={renderMarkdown(
              '### Token Rules\n\n- All colors must use `--flex-color-*` tokens (no hardcoded hex)\n- Spacing must use `--flex-space-*` tokens\n- Font families must use `--flex-font-sans` or `--flex-font-mono`\n- Font sizes must use `--flex-text-*` tokens\n- Border radii must use `--flex-radius-*` tokens\n- Exception: USWDS components may use hardcoded rem/px for visual conformance\n\n### Component Rules\n\n- One CSS file per component, co-located with its TSX\n- Block CSS handles appearance (color, typography, borders), not layout between siblings\n- Use `data-` attributes for state/variants (`data-status`, `data-variant`, `data-size`)\n- Every interactive component must have `:focus-visible` and `:disabled` styles\n\n### Accessibility\n\n- 44px minimum touch target\n- Form fields must have associated `<label>`\n- Error states need color + text (not color alone)\n- Respect `prefers-reduced-motion`\n- Support `prefers-contrast`',
            )}
          />
        </section>
      </Layout>,
    )
  }

  if (slug === 'base-classes') {
    const sidebarData = getDesignSystemSidebar(
      '/catalog/design-system/base-classes',
    )
    const sidebar = <CatalogSidebar sections={sidebarData} />

    return c.html(
      <Layout
        title="Base Classes — Design System"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <h1>Base Classes</h1>

        <section class="l-stack">
          <p>
            Base classes extract shared CSS properties into multi-selector rules
            in <code class="flex-mono">base-classes.css</code>. Components
            automatically inherit these styles through their class names — no
            markup changes needed. Component stylesheets contain only
            component-specific overrides.
          </p>
        </section>

        <section class="l-stack" id="form-control">
          <h2>Form Control Base</h2>
          <p>
            Shared by all text-entry form controls. Use{' '}
            <code class="flex-mono">class="flex-control"</code> on custom
            elements to opt in.
          </p>
          <Table striped>
            <thead>
              <tr>
                <th>Selector</th>
                <th>Component</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code class="flex-mono">.flex-control</code>
                </td>
                <td>Opt-in for custom elements</td>
              </tr>
              <tr>
                <td>
                  <code class="flex-mono">.flex-input</code>
                </td>
                <td>
                  <a
                    href={resolveUrl('/catalog/design-system/flex-text-input')}
                  >
                    Text Input
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <code class="flex-mono">.flex-select</code>
                </td>
                <td>
                  <a href={resolveUrl('/catalog/design-system/flex-select')}>
                    Select
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <code class="flex-mono">.flex-textarea</code>
                </td>
                <td>
                  <a href={resolveUrl('/catalog/design-system/flex-textarea')}>
                    Textarea
                  </a>
                </td>
              </tr>
            </tbody>
          </Table>
          <p>
            <strong>Properties provided:</strong> font-family, font-size,
            line-height, color, background-color, border, border-radius,
            appearance, display, width, max-width, padding, margin-top. Plus
            focus-visible, disabled, error, and success state styles.
          </p>
        </section>

        <section class="l-stack" id="typography">
          <h2>Typography Base</h2>
          <p>
            Shared by text-bearing USWDS elements. Use{' '}
            <code class="flex-mono">class="flex-prose"</code> on containers to
            opt in.
          </p>
          <Table striped>
            <thead>
              <tr>
                <th>Selector</th>
                <th>Component</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code class="flex-mono">.flex-prose</code>
                </td>
                <td>Opt-in for containers</td>
              </tr>
              <tr>
                <td>
                  <code class="flex-mono">.flex-label</code>
                </td>
                <td>
                  <a href={resolveUrl('/catalog/design-system/flex-label')}>
                    Label
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <code class="flex-mono">.flex-error-message</code>
                </td>
                <td>
                  <a
                    href={resolveUrl(
                      '/catalog/design-system/flex-error-message',
                    )}
                  >
                    Error Message
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <code class="flex-mono">.flex-legend</code>
                </td>
                <td>Legend (fieldset)</td>
              </tr>
            </tbody>
          </Table>
          <p>
            <strong>Properties provided:</strong> font-family, font-size,
            line-height, color.
          </p>
        </section>

        <section class="l-stack" id="choice-input">
          <h2>Choice Input Label</h2>
          <p>
            Shared by checkbox and radio label elements. Provides typography,
            cursor, display, font-weight, and position.
          </p>
          <Table striped>
            <thead>
              <tr>
                <th>Selector</th>
                <th>Component</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code class="flex-mono">.flex-checkbox__label</code>
                </td>
                <td>
                  <a href={resolveUrl('/catalog/design-system/flex-checkbox')}>
                    Checkbox
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <code class="flex-mono">.flex-radio__label</code>
                </td>
                <td>
                  <a href={resolveUrl('/catalog/design-system/flex-radio')}>
                    Radio
                  </a>
                </td>
              </tr>
            </tbody>
          </Table>
          <p>
            <strong>Properties provided:</strong> font-family, font-size,
            line-height, color, cursor, display, font-weight, position. Plus
            focus-visible and disabled state styles.
          </p>
        </section>

        <section class="l-stack" id="alert-icon">
          <h2>Alert Icon Base</h2>
          <p>
            Shared pseudo-element styles for icon display in alert components.
          </p>
          <Table striped>
            <thead>
              <tr>
                <th>Selector</th>
                <th>Component</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code class="flex-mono">.flex-alert::before</code>
                </td>
                <td>
                  <a href={resolveUrl('/catalog/design-system/flex-alert')}>
                    Alert
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <code class="flex-mono">.flex-site-alert__body::before</code>
                </td>
                <td>
                  <a
                    href={resolveUrl('/catalog/design-system/flex-site-alert')}
                  >
                    Site Alert
                  </a>
                </td>
              </tr>
            </tbody>
          </Table>
          <p>
            <strong>Properties provided:</strong> content, position,
            background-color, mask-size, mask-repeat, -webkit-mask-size,
            -webkit-mask-repeat.
          </p>
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
      <Layout
        title="Data Visualizations — Design System"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
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

  if (slug === 'layout') {
    const sidebarData = getDesignSystemSidebar('/catalog/design-system/layout')
    const sidebar = <CatalogSidebar sections={sidebarData} />

    return c.html(
      <Layout
        title="Layout — Design System"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <h1>Layout</h1>

        <section class="l-stack">
          <h2>Two-tier model</h2>
          <p>
            The layout system operates in two tiers. Tier 1 is the{' '}
            <strong>page layout</strong> — the top-level structural skeleton
            that defines how the page is divided into regions (header, main
            content, sidebar, footer). Tier 2 is <strong>compositions</strong> —
            layout primitives such as <code class="flex-mono">l-stack</code>,{' '}
            <code class="flex-mono">l-cluster</code>, and{' '}
            <code class="flex-mono">l-grid</code> that operate <em>within</em>{' '}
            those regions.
          </p>
          <p>Two rules govern this model:</p>
          <ul>
            <li>
              Every page picks <strong>exactly one</strong> page layout class.
            </li>
            <li>Page layouts never nest inside one another.</li>
          </ul>
          <p>
            Compositions may nest freely within regions. Page layouts may not.
          </p>
        </section>

        <section class="l-stack">
          <h2>Page layouts</h2>

          <div class="l-stack">
            <h3>
              <code class="flex-mono">l-page-content</code>
            </h3>
            <p>
              A centered single-column layout. The main content area is
              constrained to a readable line length and centered in the
              viewport. There is no sidebar.
            </p>
            <p>
              <strong>When to use:</strong> Use for focused, reading-heavy pages
              — documentation, articles, form completion flows — where a sidebar
              would distract from the primary task. Most catalog pages use this
              layout.
            </p>
            <p>
              Apply the class to the <code class="flex-mono">main</code> element
              directly. The page-level site chrome (header, footer) lives
              outside the page layout.
            </p>
            <pre>
              <code>{`<main class="l-page-content">
  <h1>Title</h1>
  <p>Body.</p>
  <figure class="l-feature">Wider element</figure>
</main>`}</code>
            </pre>
          </div>

          <div class="l-stack">
            <h3>
              <code class="flex-mono">l-page-sidebar-start</code>
            </h3>
            <p>
              A two-column layout with a navigation sidebar on the{' '}
              <strong>left</strong> (start) and main content on the right. At
              narrow viewports the sidebar collapses and may be toggled open.
            </p>
            <p>
              <strong>When to use:</strong> Use when the page belongs to a
              section with persistent secondary navigation — catalog pages,
              multi-step wizards with a step list, or admin dashboards. The
              sidebar communicates hierarchy and position within a larger
              structure.
            </p>
            <p>
              Apply the class to a wrapper <code class="flex-mono">div</code>{' '}
              with exactly two children:{' '}
              <code class="flex-mono">.l-page-sidebar</code> and{' '}
              <code class="flex-mono">.l-page-main</code>. The page-level site
              chrome lives outside the wrapper.
            </p>
            <pre>
              <code>{`<div class="l-page-sidebar-start">
  <aside class="l-page-sidebar">
    <nav>...</nav>
  </aside>
  <main class="l-page-main">
    <h1>Title</h1>
    <p>Body.</p>
    <figure class="l-feature">Wider element</figure>
  </main>
</div>`}</code>
            </pre>
          </div>

          <div class="l-stack">
            <h3>
              <code class="flex-mono">l-page-sidebar-end</code>
            </h3>
            <p>
              A two-column layout with a contextual sidebar on the{' '}
              <strong>right</strong> (end) and main content on the left. At
              narrow viewports the sidebar collapses below the main content.
            </p>
            <p>
              <strong>When to use:</strong> Use for contextual supplemental
              content that enhances but does not drive navigation — help text,
              related links, table of contents for the current page, or a
              persistent preview panel. The content reads left-to-right with the
              sidebar as an aside.
            </p>
            <p>
              Same wrapper pattern as{' '}
              <code class="flex-mono">l-page-sidebar-start</code>: a{' '}
              <code class="flex-mono">div</code> with{' '}
              <code class="flex-mono">.l-page-main</code> first and{' '}
              <code class="flex-mono">.l-page-sidebar</code> second.
            </p>
            <pre>
              <code>{`<div class="l-page-sidebar-end">
  <main class="l-page-main">
    <h1>Title</h1>
    <p>Body.</p>
    <figure class="l-feature">Wider element</figure>
  </main>
  <aside class="l-page-sidebar">
    <nav>...</nav>
  </aside>
</div>`}</code>
            </pre>
          </div>
        </section>

        <section class="l-stack">
          <h2>Breakout tracks</h2>
          <p>
            Within a page layout, content can break out of the default readable
            line-length constraint using width track classes. Breakout classes (
            <code class="flex-mono">.l-popout</code>,{' '}
            <code class="flex-mono">.l-feature</code>,{' '}
            <code class="flex-mono">.l-full</code>) apply to direct children of{' '}
            <code class="flex-mono">.l-page-content</code> or{' '}
            <code class="flex-mono">.l-page-main</code>. For the single-column{' '}
            <code class="flex-mono">l-page-content</code> layout, that is the
            page layout element itself. For the sidebar layouts, that is the
            inner <code class="flex-mono">.l-page-main</code> inside the{' '}
            <code class="flex-mono">.l-page-sidebar-start</code> or{' '}
            <code class="flex-mono">.l-page-sidebar-end</code> wrapper.
          </p>
          <ul>
            <li>
              <strong>content (default)</strong> — Stays within the readable
              measure. No extra class needed.
            </li>
            <li>
              <code class="flex-mono">l-popout</code> — Adds up to ~2rem on each
              side beyond the content track; good for wide tables and card
              groups.
            </li>
            <li>
              <code class="flex-mono">l-feature</code> — Adds up to ~5rem on
              each side beyond the content track; useful for hero sections and
              wide images.
            </li>
            <li>
              <code class="flex-mono">l-full</code> — Edge-to-edge across the
              full page width with no horizontal padding.
            </li>
          </ul>
          <p>
            Width variants are available via the{' '}
            <code class="flex-mono">data-width</code> attribute on{' '}
            <code class="flex-mono">.l-page-content</code> or{' '}
            <code class="flex-mono">.l-page-main</code>. It overrides{' '}
            <code class="flex-mono">--flex-content-default</code> so the
            content-track width cascades to all descendants:{' '}
            <code class="flex-mono">data-width="narrow"</code> tightens the
            measure for short-form content;{' '}
            <code class="flex-mono">data-width="wide"</code> relaxes it for
            data-dense views.
          </p>
        </section>

        <section class="l-stack">
          <h2>Container contract</h2>
          <p>
            The page layouts define named CSS containers that components can
            query via <code class="flex-mono">@container</code>. The{' '}
            <code class="flex-mono">page-content</code> named container is set
            up on every page layout — it lives on{' '}
            <code class="flex-mono">.l-page-content</code> and on{' '}
            <code class="flex-mono">.l-page-main</code> inside sidebar layouts.
            The <code class="flex-mono">page-sidebar</code> named container
            exists only when one of the sidebar layouts is used (it is set up on{' '}
            <code class="flex-mono">
              .l-page-sidebar-start &gt; .l-page-sidebar
            </code>{' '}
            and{' '}
            <code class="flex-mono">
              .l-page-sidebar-end &gt; .l-page-sidebar
            </code>
            ).
          </p>
          <pre>
            <code>{`/* Adapt to the content region width, not the viewport */
@container page-content (max-width: 600px) {
  .my-component { flex-direction: column; }
}`}</code>
          </pre>
          <p>
            This means a component placed in a narrower content region behaves
            correctly regardless of viewport width — it responds to its actual
            container.
          </p>
        </section>

        <section class="l-stack">
          <h2>
            The <code class="flex-mono">l-switcher</code> composition
          </h2>
          <p>
            The <code class="flex-mono">l-switcher</code> composition is a
            responsive row that automatically collapses to a vertical stack when
            the container is too narrow to display items side by side. It is the
            preferred pattern for form field groups where two or three short
            fields logically belong on the same row.
          </p>
          <pre>
            <code>{`<div class="l-switcher" style="--threshold: 30rem;">
  <div>
    <label for="first-name">First name</label>
    <input id="first-name" type="text" />
  </div>
  <div>
    <label for="last-name">Last name</label>
    <input id="last-name" type="text" />
  </div>
</div>`}</code>
          </pre>
          <p>
            The threshold at which the switcher collapses is controlled by the{' '}
            <code class="flex-mono">--threshold</code> custom property (default:
            30rem). Gap between items is controlled by{' '}
            <code class="flex-mono">--switcher-space</code> (defaults to{' '}
            <code class="flex-mono">--flex-space-md</code>). Uses the Every
            Layout flexbox trick — no media queries or container queries
            required. Children switch modes based on the switcher's own
            available width, which makes it safe to use inside any parent
            layout.
          </p>
        </section>

        <section class="l-stack">
          <h2>What this system does NOT provide</h2>
          <p>
            To keep the layout system predictable and prevent misuse, the
            following patterns are intentionally absent:
          </p>
          <ul>
            <li>A 12-column grid system</li>
            <li>
              Breakpoint-prefixed column span classes (e.g.{' '}
              <code class="flex-mono">md:col-span-6</code>)
            </li>
            <li>
              Named grid areas that components are expected to fill by
              convention
            </li>
            <li>
              Utility classes for arbitrary widths or margins on layout regions
            </li>
            <li>Nested page layouts</li>
            <li>A fixed navigation rail or app-shell chrome component</li>
          </ul>
          <p>
            If you need something from this list, open a catalog decision
            document first. Introducing ad-hoc layout utilities without a
            decision record leads to drift that is hard to reverse.
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
    const examples = await import(
      `../../../../design-system/components/${meta.slug}/examples.tsx`
    )
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
      join(
        process.cwd(),
        'src',
        'design-system',
        'components',
        meta.slug,
        'styles.css',
      ),
      'utf-8',
    )
  } catch {
    // No styles.css for this component
  }

  // Load conformance spec
  let conformanceSpec: ConformanceSpec | null = null
  try {
    const specModule = await import(
      `../../../../design-system/components/${meta.slug}/conformance-spec.ts`
    )
    conformanceSpec = specModule.spec
  } catch {
    // No conformance spec for this component
  }

  return c.html(
    <Layout
      title={`${meta.name} — Design System`}
      sidebar={sidebar}
      currentPath="/catalog"
    >
      <style dangerouslySetInnerHTML={{ __html: hljsStyles }} />
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
          {exampleEntries.map(([name, ExampleFn]) => {
            const title = name.replace(/([a-z])([A-Z])/g, '$1 $2')
            const rendered = (<ExampleFn />).toString()
            const formatted = formatHtml(rendered)
            const highlighted = hljs.highlight(formatted, {
              language: 'xml',
            }).value
            return (
              <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
                <h3>{title}</h3>
                <TabGroup label={`${title} example`}>
                  <Tab title="Preview">
                    <div dangerouslySetInnerHTML={{ __html: rendered }} />
                  </Tab>
                  <Tab title="Code">
                    <pre style="margin: 0; overflow-x: auto; font-size: var(--flex-text-sm); line-height: 1.5;">
                      <code
                        class="hljs"
                        dangerouslySetInnerHTML={{ __html: highlighted }}
                      />
                    </pre>
                  </Tab>
                </TabGroup>
              </div>
            )
          })}
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

      {cssSource &&
        (() => {
          const extendsMatch = cssSource.match(
            /Extends:\s*(.+?)\s*\(base-classes\.css(#[\w-]+)\)/,
          )
          const baseClassName = extendsMatch ? extendsMatch[1] : null
          const baseAnchor = extendsMatch ? extendsMatch[2] : null
          return (
            <section class="l-stack">
              <h2>Source CSS</h2>
              {baseClassName && (
                <p>
                  Base styles:{' '}
                  <a
                    href={resolveUrl(
                      `/catalog/design-system/base-classes${baseAnchor}`,
                    )}
                  >
                    {baseClassName}
                  </a>
                </p>
              )}
              <Accordion
                items={[
                  {
                    id: `${meta.slug}-css`,
                    title: 'View stylesheet',
                    content: (
                      <pre style="overflow-x: auto; margin: 0; font-size: var(--flex-text-sm); line-height: 1.5;">
                        <code
                          class="hljs"
                          dangerouslySetInnerHTML={{
                            __html: hljs.highlight(cssSource, {
                              language: 'css',
                            }).value,
                          }}
                        />
                      </pre>
                    ),
                  },
                ]}
              />
            </section>
          )
        })()}
    </Layout>,
  )
})

export default designSystem
