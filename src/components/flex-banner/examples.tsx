import type { FC } from 'hono/jsx'
import { Banner } from './index'

export const Default: FC = () => <Banner />

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default Banner</h3>
      <Default />
    </div>
  </div>
)
