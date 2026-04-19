import { getComponentsByCategory } from '../../../../design-system/registry'
import type {
  Decision,
  Story,
  WalkthroughPage,
} from '../../../../services/content/types'
import { resolveUrl } from '../../../../shared/base-path'

export function getCatalogSidebar(currentPath?: string) {
  return [
    {
      title: 'Catalog',
      items: [
        {
          label: 'Overview',
          href: resolveUrl('/catalog'),
          current: currentPath === '/catalog',
        },
      ],
    },
    {
      title: 'Presentation',
      items: [
        {
          label: 'Walkthrough',
          href: resolveUrl('/catalog/walkthrough'),
          current: currentPath === '/catalog/walkthrough',
        },
      ],
    },
    {
      title: 'The System',
      items: [
        {
          label: 'Architecture',
          href: resolveUrl('/catalog/architecture'),
          current: currentPath === '/catalog/architecture',
        },
        {
          label: 'Decisions',
          href: resolveUrl('/catalog/decisions'),
          current: currentPath === '/catalog/decisions',
        },
      ],
    },
    {
      title: 'The Work',
      items: [
        {
          label: 'Personas',
          href: resolveUrl('/catalog/personas'),
          current: currentPath === '/catalog/personas',
        },
        {
          label: 'Stories',
          href: resolveUrl('/catalog/stories'),
          current: currentPath === '/catalog/stories',
        },
        {
          label: 'Experiments',
          href: resolveUrl('/catalog/experiments'),
          current: currentPath === '/catalog/experiments',
        },
      ],
    },
    {
      title: 'The Craft',
      items: [
        {
          label: 'Design System',
          href: resolveUrl('/catalog/design-system'),
          current: currentPath === '/catalog/design-system',
        },
      ],
    },
  ]
}

/**
 * Contextual sidebar for design system pages.
 * Shows a "← Back to Catalog" link, then component categories
 * with individual component links under each.
 */
export function getDesignSystemSidebar(currentPath?: string) {
  const grouped = getComponentsByCategory()

  // Category display names (capitalized, readable)
  const categoryLabels: Record<string, string> = {
    form: 'Form Controls',
    action: 'Actions',
    feedback: 'Feedback',
    navigation: 'Navigation',
    layout: 'Layout',
    process: 'Process',
    identity: 'Identity',
  }

  const sections = [
    {
      title: 'Design System',
      items: [
        {
          label: '← Back to Catalog',
          href: resolveUrl('/catalog'),
          current: false,
        },
        {
          label: 'Overview',
          href: resolveUrl('/catalog/design-system'),
          current: currentPath === '/catalog/design-system',
        },
      ],
    },
    {
      title: 'Foundations',
      items: [
        {
          label: 'Tokens',
          href: resolveUrl('/catalog/design-system/tokens'),
          current: currentPath === '/catalog/design-system/tokens',
        },
        {
          label: 'Typography',
          href: resolveUrl('/catalog/design-system/typography'),
          current: currentPath === '/catalog/design-system/typography',
        },
        {
          label: 'Compositions',
          href: resolveUrl('/catalog/design-system/compositions'),
          current: currentPath === '/catalog/design-system/compositions',
        },
        {
          label: 'Base Classes',
          href: resolveUrl('/catalog/design-system/base-classes'),
          current: currentPath === '/catalog/design-system/base-classes',
        },
        {
          label: 'Rules',
          href: resolveUrl('/catalog/design-system/rules'),
          current: currentPath === '/catalog/design-system/rules',
        },
        {
          label: 'Data Visualizations',
          href: resolveUrl('/catalog/design-system/data-visualizations'),
          current: currentPath === '/catalog/design-system/data-visualizations',
        },
        {
          label: 'Layout',
          href: resolveUrl('/catalog/design-system/layout'),
          current: currentPath === '/catalog/design-system/layout',
        },
      ],
    },
    ...Object.entries(grouped).map(([category, components]) => ({
      title: categoryLabels[category] || category,
      items: components.map((comp) => ({
        label: comp.name,
        href: resolveUrl(`/catalog/design-system/${comp.slug}`),
        current: currentPath === `/catalog/design-system/${comp.slug}`,
      })),
    })),
  ]

  return sections
}

/**
 * Group display names for decision directories.
 */
const groupLabels: Record<string, string> = {
  architecture: 'Architecture',
  infrastructure: 'Infrastructure',
  'design-system': 'Design System',
}

/**
 * Contextual sidebar for decisions pages.
 * Shows decisions grouped by domain directory.
 */
export function getDecisionsSidebar(
  groups: Record<string, Decision[]>,
  currentPath?: string,
) {
  const sections = [
    {
      title: 'Decisions',
      items: [
        {
          label: '\u2190 Back to Catalog',
          href: resolveUrl('/catalog'),
          current: false,
        },
        {
          label: 'All Decisions',
          href: resolveUrl('/catalog/decisions'),
          current: currentPath === '/catalog/decisions',
        },
      ],
    },
    ...Object.entries(groups).map(([group, decisions]) => ({
      title: groupLabels[group] || group,
      items: decisions.map((d) => ({
        label: d.title,
        href: resolveUrl(`/catalog/decisions/${d.group}/${d.slug}`),
        current: currentPath === `/catalog/decisions/${d.group}/${d.slug}`,
      })),
    })),
  ]

  return sections
}

/**
 * Contextual sidebar for architecture pages.
 * Shows a "← Back to Catalog" link, an "All Docs" link, and
 * one link per architecture doc under them.
 */
export function getArchitectureSidebar(
  docs: Array<{ slug: string; title: string }>,
  currentPath?: string,
) {
  return [
    {
      title: 'Architecture',
      items: [
        {
          label: '\u2190 Back to Catalog',
          href: resolveUrl('/catalog'),
          current: false,
        },
        {
          label: 'All Docs',
          href: resolveUrl('/catalog/architecture'),
          current: currentPath === '/catalog/architecture',
        },
        ...docs.map((doc) => ({
          label: doc.title,
          href: resolveUrl(`/catalog/architecture/${doc.slug}`),
          current: currentPath === `/catalog/architecture/${doc.slug}`,
        })),
      ],
    },
  ]
}

/**
 * Contextual sidebar for stories pages.
 */
export function getStoriesSidebar(stories: Story[], currentPath?: string) {
  return [
    {
      title: 'Stories',
      items: [
        {
          label: '\u2190 Back to Catalog',
          href: resolveUrl('/catalog'),
          current: false,
        },
        {
          label: 'All Stories',
          href: resolveUrl('/catalog/stories'),
          current: currentPath === '/catalog/stories',
        },
        ...stories.map((s) => ({
          label: `#${s.issue} ${s.title}`,
          href: resolveUrl(`/catalog/stories/${s.slug}`),
          current: currentPath === `/catalog/stories/${s.slug}`,
        })),
      ],
    },
  ]
}

/**
 * Title-case a slug like "pdf-field-extraction" → "PDF Field Extraction".
 * Uppercase three-letter acronyms for common cases.
 */
export function titleCaseSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w+/g, (word) => {
    // Upper-case common short acronyms
    if (/^(pdf|api|ui|llm|cli|css|html|json|yaml|xml|sql)$/i.test(word)) {
      return word.toUpperCase()
    }
    return word.charAt(0).toUpperCase() + word.slice(1)
  })
}

export interface ExperimentSuite {
  slug: string
  title: string
  variants: Array<{ slug: string; title: string }>
}

/**
 * Contextual sidebar for experiments pages.
 * Shows a "← Back to Catalog" link, Overview, top-level pages (like Roadmap),
 * then one section per suite with its variants listed.
 */
export function getExperimentsSidebar(
  topLevelPages: Array<{ slug: string; title: string }>,
  suites: ExperimentSuite[],
  currentPath?: string,
) {
  const sections = [
    {
      title: 'Experiments',
      items: [
        {
          label: '\u2190 Back to Catalog',
          href: resolveUrl('/catalog'),
          current: false,
        },
        {
          label: 'Overview',
          href: resolveUrl('/catalog/experiments'),
          current: currentPath === '/catalog/experiments',
        },
        ...topLevelPages.map((page) => ({
          label: page.title,
          href: resolveUrl(`/catalog/experiments/${page.slug}`),
          current: currentPath === `/catalog/experiments/${page.slug}`,
        })),
      ],
    },
    ...suites.map((suite) => ({
      title: suite.title,
      items: [
        {
          label: 'Overview',
          href: resolveUrl(`/catalog/experiments/${suite.slug}`),
          current: currentPath === `/catalog/experiments/${suite.slug}`,
        },
        ...suite.variants.map((variant) => ({
          label: variant.title,
          href: resolveUrl(
            `/catalog/experiments/${suite.slug}/${variant.slug}`,
          ),
          current:
            currentPath ===
            `/catalog/experiments/${suite.slug}/${variant.slug}`,
        })),
      ],
    })),
  ]

  return sections
}

/**
 * Contextual sidebar for walkthrough pages.
 */
export function getWalkthroughSidebar(
  pages: WalkthroughPage[],
  currentPath?: string,
) {
  return [
    {
      title: 'Walkthrough',
      items: [
        {
          label: '\u2190 Back to Catalog',
          href: resolveUrl('/catalog'),
          current: false,
        },
        {
          label: 'Overview',
          href: resolveUrl('/catalog/walkthrough'),
          current: currentPath === '/catalog/walkthrough',
        },
        ...pages.map((p, i) => ({
          label: `${i + 1}. ${p.title}`,
          href: resolveUrl(`/catalog/walkthrough/${p.slug}`),
          current: currentPath === `/catalog/walkthrough/${p.slug}`,
        })),
      ],
    },
  ]
}
