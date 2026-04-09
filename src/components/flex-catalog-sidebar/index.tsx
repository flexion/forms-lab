import type { FC } from 'hono/jsx'
import {
  SideNav,
  SideNavItem,
  SideNavNested,
  SideNavSubItem,
} from '../flex-side-navigation'

interface SidebarSection {
  title: string
  items: Array<{ label: string; href: string; current?: boolean }>
}

interface CatalogSidebarProps {
  sections: SidebarSection[]
}

export const CatalogSidebar: FC<CatalogSidebarProps> = ({ sections }) => {
  // If there's only one section, render items directly
  if (sections.length === 1) {
    const section = sections[0]
    return (
      <SideNav label="Catalog navigation">
        {section.items.map((item) => (
          <SideNavItem key={item.href} href={item.href} current={item.current}>
            {item.label}
          </SideNavItem>
        ))}
      </SideNav>
    )
  }

  // Multiple sections: first section's items are top-level, remaining sections are nested groups
  const [firstSection, ...restSections] = sections

  return (
    <SideNav label="Catalog navigation">
      {firstSection.items.map((item) => (
        <SideNavItem key={item.href} href={item.href} current={item.current}>
          {item.label}
        </SideNavItem>
      ))}
      {restSections.map((section) => {
        const sectionHasCurrentItem = section.items.some((item) => item.current)
        return (
          <SideNavNested
            key={section.title}
            href="#"
            label={section.title}
            current={sectionHasCurrentItem}
          >
            {section.items.map((item) => (
              <SideNavSubItem
                key={item.href}
                href={item.href}
                current={item.current}
              >
                {item.label}
              </SideNavSubItem>
            ))}
          </SideNavNested>
        )
      })}
    </SideNav>
  )
}
