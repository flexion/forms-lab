import type { FC } from 'hono/jsx'
import { Button } from './index'

export const Default: FC = () => <Button>Default</Button>

export const Secondary: FC = () => (
  <Button variant="secondary">Secondary</Button>
)

export const AccentCool: FC = () => (
  <Button variant="accent-cool">Accent Cool</Button>
)

export const AccentWarm: FC = () => (
  <Button variant="accent-warm">Accent Warm</Button>
)

export const Base: FC = () => <Button variant="base">Base</Button>

export const Outline: FC = () => <Button variant="outline">Outline</Button>

export const Inverse: FC = () => <Button variant="inverse">Inverse</Button>

export const Unstyled: FC = () => <Button variant="unstyled">Unstyled</Button>

export const Big: FC = () => <Button size="big">Big Button</Button>

export const Small: FC = () => <Button size="small">Small Button</Button>

export const DisabledDefault: FC = () => <Button disabled>Disabled</Button>

export const DisabledSecondary: FC = () => (
  <Button variant="secondary" disabled>
    Disabled Secondary
  </Button>
)

export const DisabledOutline: FC = () => (
  <Button variant="outline" disabled>
    Disabled Outline
  </Button>
)

export const AsLink: FC = () => <Button href="/example">Link Button</Button>

export const BigSecondary: FC = () => (
  <Button variant="secondary" size="big">
    Big Secondary
  </Button>
)

export const SmallOutline: FC = () => (
  <Button variant="outline" size="small">
    Small Outline
  </Button>
)
