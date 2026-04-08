import type { FC } from 'hono/jsx'
import { Search } from './index'

export const Default: FC = () => <Search />

export const Big: FC = () => <Search size="big" id="search-big" />

export const Small: FC = () => <Search size="small" id="search-small" />

export const WithAction: FC = () => (
  <Search action="/search" placeholder="Search our site..." id="search-form" />
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px; max-width: 400px;">
    <div>
      <h3>Default Search</h3>
      <Default />
    </div>
    <div>
      <h3>Big Search</h3>
      <Big />
    </div>
    <div>
      <h3>Small Search</h3>
      <Small />
    </div>
    <div>
      <h3>With Action</h3>
      <WithAction />
    </div>
  </div>
)
