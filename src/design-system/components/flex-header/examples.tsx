import type { FC } from 'hono/jsx'
import { Header, HeaderNavItem, type HeaderUser } from './index'

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

const exampleUser: HeaderUser = {
  login: 'danielnaab',
  name: 'Daniel Naab',
  avatarUrl: 'https://github.com/danielnaab.png',
}

export const SignedIn: FC = () => (
  <Header user={exampleUser} signoutAction="/auth/signout">
    <HeaderNavItem href="/catalog" label="Catalog" />
    <HeaderNavItem href="/projects" label="Projects" current />
  </Header>
)
