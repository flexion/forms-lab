import type { FC } from 'hono/jsx'
import {
  Footer,
  FooterContactInfo,
  FooterLogo,
  FooterNav,
  FooterPrimary,
  FooterReturnToTop,
  FooterSecondary,
} from './index'

export const Slim: FC = () => (
  <Footer>
    <FooterReturnToTop />
    <FooterPrimary>
      <FooterNav>
        <ul>
          <li>
            <a class="flex-footer__primary-link" href="/primary">
              Primary link
            </a>
          </li>
          <li>
            <a class="flex-footer__primary-link" href="/another">
              Another link
            </a>
          </li>
        </ul>
      </FooterNav>
    </FooterPrimary>
    <FooterSecondary>
      <FooterLogo
        src="/static/img/logo-placeholder.png"
        alt="Agency logo"
        heading="Agency Name"
      />
      <FooterContactInfo>
        <a href="tel:+15555555555">(555) 555-5555</a>
        <a href="mailto:info@agency.gov">info@agency.gov</a>
      </FooterContactInfo>
    </FooterSecondary>
  </Footer>
)

export const Medium: FC = () => (
  <Footer variant="medium">
    <FooterReturnToTop />
    <FooterPrimary>
      <FooterNav>
        <ul>
          <li>
            <a class="flex-footer__primary-link" href="/topic">
              Topic
            </a>
          </li>
          <li>
            <a class="flex-footer__primary-link" href="/sub-topic">
              Sub-topic
            </a>
          </li>
        </ul>
      </FooterNav>
    </FooterPrimary>
    <FooterSecondary>
      <FooterLogo
        src="/static/img/logo-placeholder.png"
        alt="Agency logo"
        heading="Agency Name"
      />
      <FooterContactInfo>
        <a href="tel:+15555555555">(555) 555-5555</a>
      </FooterContactInfo>
    </FooterSecondary>
  </Footer>
)

export const Big: FC = () => (
  <Footer variant="big">
    <FooterReturnToTop />
    <FooterPrimary>
      <FooterNav>
        <ul>
          <li>
            <a class="flex-footer__primary-link" href="/section-one">
              Section One
            </a>
          </li>
          <li>
            <a class="flex-footer__primary-link" href="/section-two">
              Section Two
            </a>
          </li>
          <li>
            <a class="flex-footer__primary-link" href="/section-three">
              Section Three
            </a>
          </li>
        </ul>
      </FooterNav>
    </FooterPrimary>
    <FooterSecondary>
      <FooterLogo
        src="/static/img/logo-placeholder.png"
        alt="Agency logo"
        heading="Agency Name"
      />
      <FooterContactInfo>
        <a href="tel:+15555555555">(555) 555-5555</a>
        <a href="mailto:info@agency.gov">info@agency.gov</a>
      </FooterContactInfo>
    </FooterSecondary>
  </Footer>
)
