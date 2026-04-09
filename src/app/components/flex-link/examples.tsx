import type { FC } from 'hono/jsx'
import { Link } from './index'

export const Default: FC = () => <Link href="/example">An example link</Link>

export const External: FC = () => (
  <Link href="https://designsystem.digital.gov" external>
    An external link
  </Link>
)
