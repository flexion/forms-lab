import type { FC } from 'hono/jsx'
import { Pagination } from './index'

export const Default: FC = () => (
  <Pagination totalPages={10} currentPage={4} baseHref="/results" />
)

export const FirstPage: FC = () => (
  <Pagination totalPages={10} currentPage={1} baseHref="/results" />
)

export const LastPage: FC = () => (
  <Pagination totalPages={10} currentPage={10} baseHref="/results" />
)

export const FewPages: FC = () => (
  <Pagination totalPages={3} currentPage={2} baseHref="/results" />
)
