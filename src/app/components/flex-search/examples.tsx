import type { FC } from 'hono/jsx'
import { Search } from './index'

export const Default: FC = () => <Search />

export const Big: FC = () => <Search size="big" id="search-big" />

export const Small: FC = () => <Search size="small" id="search-small" />

export const WithAction: FC = () => (
  <Search action="/search" placeholder="Search our site..." id="search-form" />
)
