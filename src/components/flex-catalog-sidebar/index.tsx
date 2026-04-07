import type { FC } from 'hono/jsx'

interface SidebarSection {
  title: string
  items: Array<{ label: string; href: string; current?: boolean }>
}

interface CatalogSidebarProps {
  sections: SidebarSection[]
}

export const CatalogSidebar: FC<CatalogSidebarProps> = ({ sections }) => {
  return (
    <nav aria-label="Catalog navigation">
      <div class="l-stack" style="--stack-space: var(--flex-space-lg);">
        {sections.map((section) => (
          <div key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={item.current ? 'page' : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
