import type { FC } from 'hono/jsx'
import { SiteAlert } from './index'

const alertBody = (
  <>
    Lorem ipsum dolor sit amet, <a href="/example">consectetur adipiscing</a>{' '}
    elit, sed do eiusmod.
  </>
)

export const InfoSiteAlert: FC = () => (
  <SiteAlert variant="info" heading="Informative status">
    {alertBody}
  </SiteAlert>
)

export const EmergencySiteAlert: FC = () => (
  <SiteAlert variant="emergency" heading="Emergency status">
    {alertBody}
  </SiteAlert>
)

export const SlimSiteAlert: FC = () => (
  <SiteAlert variant="info" slim>
    {alertBody}
  </SiteAlert>
)

export const NoIconSiteAlert: FC = () => (
  <SiteAlert variant="info" noIcon heading="Informative status">
    {alertBody}
  </SiteAlert>
)

export const NoHeadingSiteAlert: FC = () => (
  <SiteAlert variant="info" noHeading>
    {alertBody}
  </SiteAlert>
)

export const AllVariants: FC = () => (
  <div class="l-stack">
    <h3>Variants</h3>
    <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
      <InfoSiteAlert />
      <EmergencySiteAlert />
    </div>
    <h3>Modifiers</h3>
    <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
      <SlimSiteAlert />
      <NoIconSiteAlert />
      <NoHeadingSiteAlert />
    </div>
  </div>
)
