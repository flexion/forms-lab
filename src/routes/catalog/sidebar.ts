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
