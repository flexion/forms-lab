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
