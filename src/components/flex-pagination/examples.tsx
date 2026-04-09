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

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default (Page 4 of 10)</h3>
      <Default />
    </div>
    <div>
      <h3>First Page</h3>
      <FirstPage />
    </div>
    <div>
      <h3>Last Page</h3>
      <LastPage />
    </div>
    <div>
      <h3>Few Pages (3 total)</h3>
      <FewPages />
    </div>
  </div>
)
