import { getComponentsByCategory } from '../../components/registry'
import type { Decision, Story } from '../../types/models'

export function getCatalogSidebar(currentPath?: string) {
  return [
    {
      title: 'Catalog',
      items: [
        {
          label: 'Overview',
          href: '/catalog',
          current: currentPath === '/catalog',
        },
        {
          label: 'Personas',
          href: '/catalog/personas',
          current: currentPath === '/catalog/personas',
        },
        {
          label: 'Decisions',
          href: '/catalog/decisions',
          current: currentPath === '/catalog/decisions',
        },
        {
          label: 'Architecture',
          href: '/catalog/architecture',
          current: currentPath === '/catalog/architecture',
        },
        {
          label: 'Stories',
          href: '/catalog/stories',
          current: currentPath === '/catalog/stories',
        },
        {
          label: 'Experiments',
          href: '/catalog/experiments',
          current: currentPath === '/catalog/experiments',
        },
        {
          label: 'Design System',
          href: '/catalog/design-system',
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
          href: '/catalog',
          current: false,
        },
        {
          label: 'Overview',
          href: '/catalog/design-system',
          current: currentPath === '/catalog/design-system',
        },
      ],
    },
    {
      title: 'Foundations',
      items: [
        {
          label: 'Tokens',
          href: '/catalog/design-system/tokens',
          current: currentPath === '/catalog/design-system/tokens',
        },
        {
          label: 'Typography',
          href: '/catalog/design-system/typography',
          current: currentPath === '/catalog/design-system/typography',
        },
        {
          label: 'Compositions',
          href: '/catalog/design-system/compositions',
          current: currentPath === '/catalog/design-system/compositions',
        },
        {
          label: 'Base Classes',
          href: '/catalog/design-system/base-classes',
          current: currentPath === '/catalog/design-system/base-classes',
        },
        {
          label: 'Rules',
          href: '/catalog/design-system/rules',
          current: currentPath === '/catalog/design-system/rules',
        },
        {
          label: 'Data Visualizations',
          href: '/catalog/design-system/data-visualizations',
          current: currentPath === '/catalog/design-system/data-visualizations',
        },
      ],
    },
    ...Object.entries(grouped).map(([category, components]) => ({
      title: categoryLabels[category] || category,
      items: components.map((comp) => ({
        label: comp.name,
        href: `/catalog/design-system/${comp.slug}`,
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
          href: '/catalog',
          current: false,
        },
        {
          label: 'All Decisions',
          href: '/catalog/decisions',
          current: currentPath === '/catalog/decisions',
        },
      ],
    },
    ...Object.entries(groups).map(([group, decisions]) => ({
      title: groupLabels[group] || group,
      items: decisions.map((d) => ({
        label: d.title,
        href: `/catalog/decisions/${d.group}/${d.slug}`,
        current: currentPath === `/catalog/decisions/${d.group}/${d.slug}`,
      })),
    })),
  ]

  return sections
}

/**
 * Contextual sidebar for stories pages.
 * Shows stories grouped by milestone.
 */
export function getStoriesSidebar(
  byMilestone: Record<string, Story[]>,
  currentPath?: string,
) {
  const sections = [
    {
      title: 'Stories',
      items: [
        {
          label: '\u2190 Back to Catalog',
          href: '/catalog',
          current: false,
        },
        {
          label: 'All Stories',
          href: '/catalog/stories',
          current: currentPath === '/catalog/stories',
        },
      ],
    },
    ...Object.entries(byMilestone).map(([milestone, stories]) => ({
      title: milestone,
      items: stories.map((s) => ({
        label: `#${s.issue} ${s.title}`,
        href: `/catalog/stories/${s.slug}`,
        current: currentPath === `/catalog/stories/${s.slug}`,
      })),
    })),
  ]

  return sections
}
