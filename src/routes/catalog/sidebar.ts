import { getComponentsByCategory } from '../../components/registry'

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
          label: 'Typography',
          href: '/catalog/design-system/typography',
          current: currentPath === '/catalog/design-system/typography',
        },
        {
          label: 'Base Classes',
          href: '/catalog/design-system/base-classes',
          current: currentPath === '/catalog/design-system/base-classes',
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
