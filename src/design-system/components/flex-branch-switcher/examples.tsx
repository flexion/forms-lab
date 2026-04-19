import type { FC } from 'hono/jsx'
import { BranchSwitcher } from './index'

export const Default: FC = () => (
  <BranchSwitcher
    current="main"
    branches={[{ name: 'main' }, { name: 'story-1/intake-form', ahead: 3 }]}
    branchHref={(b) => `/${b}/`}
    createHref="/branches/create"
  />
)

export const OnFeatureBranch: FC = () => (
  <BranchSwitcher
    current="story-1/intake-form"
    branches={[
      { name: 'main' },
      { name: 'story-1/intake-form', ahead: 3 },
      { name: 'story-2/pdf-extract', ahead: 1 },
    ]}
    branchHref={(b) => `/${b}/`}
    createHref="/branches/create"
  />
)
