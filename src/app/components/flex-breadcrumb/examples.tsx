import type { FC } from 'hono/jsx'
import { Breadcrumb } from './index'

export const Default: FC = () => (
  <Breadcrumb
    items={[
      { label: 'Home', href: '/' },
      { label: 'Catalog', href: '/catalog' },
      { label: 'Current Page' },
    ]}
  />
)

export const Wrap: FC = () => (
  <Breadcrumb
    variant="wrap"
    items={[
      { label: 'Home', href: '/' },
      { label: 'Federal Agencies', href: '/agencies' },
      { label: 'Department of Examples', href: '/agencies/examples' },
      {
        label: 'Programs and Initiatives',
        href: '/agencies/examples/programs',
      },
      { label: 'Current Page' },
    ]}
  />
)

export const TwoLevels: FC = () => (
  <Breadcrumb
    items={[{ label: 'Home', href: '/' }, { label: 'Current Page' }]}
  />
)
