import type { FC } from 'hono/jsx'
import { Header, HeaderNavItem } from './index'

export const Default: FC = () => (
  <Header>
    <HeaderNavItem href="/catalog" label="Catalog" />
    <HeaderNavItem href="/catalog/design-system" label="Design System" />
  </Header>
)

export const WithCurrentPage: FC = () => (
  <Header>
    <HeaderNavItem href="/catalog" label="Catalog" current />
    <HeaderNavItem href="/catalog/design-system" label="Design System" />
  </Header>
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default Header</h3>
      <Default />
    </div>
    <div>
      <h3>With Current Page</h3>
      <WithCurrentPage />
    </div>
  </div>
)
