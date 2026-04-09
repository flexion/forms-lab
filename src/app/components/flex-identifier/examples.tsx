import type { FC } from 'hono/jsx'
import {
  Identifier,
  IdentifierLinkItem,
  IdentifierLinks,
  IdentifierMasthead,
  IdentifierUsagov,
} from './index'

export const Default: FC = () => (
  <Identifier>
    <IdentifierMasthead
      logoSrc="/static/img/logo-img.png"
      logoAlt="Agency logo"
      domain="agency.gov"
      agencyName="Agency Name"
    />
    <IdentifierLinks>
      <IdentifierLinkItem href="#">About</IdentifierLinkItem>
      <IdentifierLinkItem href="#">Accessibility</IdentifierLinkItem>
      <IdentifierLinkItem href="#">FOIA Requests</IdentifierLinkItem>
      <IdentifierLinkItem href="#">No FEAR Act</IdentifierLinkItem>
      <IdentifierLinkItem href="#">Privacy Policy</IdentifierLinkItem>
    </IdentifierLinks>
    <IdentifierUsagov />
  </Identifier>
)
