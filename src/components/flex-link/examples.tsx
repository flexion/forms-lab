import type { FC } from 'hono/jsx'
import { Link } from './index'

export const Default: FC = () => <Link href="/example">An example link</Link>

export const External: FC = () => (
  <Link href="https://designsystem.digital.gov" external>
    An external link
  </Link>
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default Link</h3>
      <Default />
    </div>
    <div>
      <h3>External Link</h3>
      <External />
    </div>
  </div>
)
