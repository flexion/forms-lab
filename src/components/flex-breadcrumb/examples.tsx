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

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default Breadcrumb</h3>
      <Default />
    </div>
    <div>
      <h3>Wrap Variant</h3>
      <Wrap />
    </div>
    <div>
      <h3>Two Levels</h3>
      <TwoLevels />
    </div>
  </div>
)
