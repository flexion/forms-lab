import type { FC } from 'hono/jsx'
import { Button } from './index'

export const Default: FC = () => <Button>Default</Button>

export const Secondary: FC = () => <Button variant="secondary">Secondary</Button>

export const AccentCool: FC = () => <Button variant="accent-cool">Accent Cool</Button>

export const AccentWarm: FC = () => <Button variant="accent-warm">Accent Warm</Button>

export const Base: FC = () => <Button variant="base">Base</Button>

export const Outline: FC = () => <Button variant="outline">Outline</Button>

export const Inverse: FC = () => <Button variant="inverse">Inverse</Button>

export const Unstyled: FC = () => <Button variant="unstyled">Unstyled</Button>

export const Big: FC = () => <Button size="big">Big Button</Button>

export const Small: FC = () => <Button size="small">Small Button</Button>

export const DisabledDefault: FC = () => <Button disabled>Disabled</Button>

export const DisabledSecondary: FC = () => <Button variant="secondary" disabled>Disabled Secondary</Button>

export const DisabledOutline: FC = () => <Button variant="outline" disabled>Disabled Outline</Button>

export const AsLink: FC = () => <Button href="/example">Link Button</Button>

export const BigSecondary: FC = () => <Button variant="secondary" size="big">Big Secondary</Button>

export const SmallOutline: FC = () => <Button variant="outline" size="small">Small Outline</Button>

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Variants</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <Default />
        <Secondary />
        <AccentCool />
        <AccentWarm />
        <Base />
        <Outline />
        <Unstyled />
      </div>
    </div>
    <div style="background: #1b1b1b; padding: 16px; border-radius: 4px;">
      <h3 style="color: white; margin-top: 0;">Inverse (dark background)</h3>
      <Inverse />
    </div>
    <div>
      <h3>Sizes</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <Small />
        <Default />
        <Big />
      </div>
    </div>
    <div>
      <h3>Disabled States</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <DisabledDefault />
        <DisabledSecondary />
        <DisabledOutline />
      </div>
    </div>
    <div>
      <h3>As Link</h3>
      <AsLink />
    </div>
    <div>
      <h3>Combined</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <BigSecondary />
        <SmallOutline />
      </div>
    </div>
  </div>
)
