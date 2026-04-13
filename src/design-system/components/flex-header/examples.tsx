import type { FC } from 'hono/jsx'
import type { SessionUser } from '../../../lib/session'
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

const exampleUser: SessionUser = {
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
