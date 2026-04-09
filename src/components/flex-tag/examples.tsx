import type { FC } from 'hono/jsx'
import { Tag } from './index'

export const Default: FC = () => <Tag>New</Tag>

export const Big: FC = () => <Tag size="big">New</Tag>

export const MultipleTags: FC = () => (
  <div>
    <Tag>Info</Tag>
    <Tag>Draft</Tag>
    <Tag>Pending</Tag>
  </div>
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default Tag</h3>
      <Default />
    </div>
    <div>
      <h3>Big Tag</h3>
      <Big />
    </div>
    <div>
      <h3>Multiple Tags</h3>
      <MultipleTags />
    </div>
  </div>
)
