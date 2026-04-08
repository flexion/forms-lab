import type { Child, FC, PropsWithChildren } from 'hono/jsx'
import { Banner } from '../flex-banner'
import {
  Footer,
  FooterNav,
  FooterPrimary,
  FooterReturnToTop,
  FooterSecondary,
} from '../flex-footer'

interface LayoutProps {
  title?: string
  sidebar?: Child
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const title = props.title ? `${props.title} | Forms Lab` : 'Forms Lab'

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <Banner
          ariaLabel="A digital services project by Flexion"
          headerText="A digital services project by Flexion"
          headerImage={undefined}
          buttonText="About this project"
          guidance={[
            {
              icon: { src: '/static/sprite.svg#github', alt: 'Open source' },
              heading: 'Open source',
              text: (
                <>
                  This project is developed in the open. View the source code on{' '}
                  <a href="https://github.com/flexion/forms-lab">GitHub</a>.
                </>
              ),
            },
            {
              icon: { src: '/static/sprite.svg#groups', alt: 'About Flexion' },
              heading: 'About Flexion',
              text: (
                <>
                  <a href="https://flexion.us">Flexion</a> builds digital
                  services for federal, state, and local government agencies.
                </>
              ),
            },
          ]}
        />
        <header class="site-header">
          <div class="l-center">
            <h1>
              <a href="/">Forms Lab</a>
            </h1>
            <p>LLM-Assisted Forms Platform</p>
            <nav class="site-nav">
              <a href="/">Home</a>
              <a href="/catalog">Catalog</a>
            </nav>
          </div>
        </header>
        {props.sidebar ? (
          <div class="catalog-layout">
            <aside class="catalog-sidebar">{props.sidebar}</aside>
            <main>
              <div class="l-stack">{props.children}</div>
            </main>
          </div>
        ) : (
          <main class="l-center">
            <div class="l-stack">{props.children}</div>
          </main>
        )}
        <Footer variant="slim">
          <FooterReturnToTop />
          <FooterPrimary>
            <FooterNav>
              <ul>
                <li>
                  <a class="flex-footer__primary-link" href="/">
                    Home
                  </a>
                </li>
                <li>
                  <a class="flex-footer__primary-link" href="/catalog">
                    Catalog
                  </a>
                </li>
                <li>
                  <a
                    class="flex-footer__primary-link"
                    href="/catalog/design-system"
                  >
                    Design System
                  </a>
                </li>
              </ul>
            </FooterNav>
          </FooterPrimary>
          <FooterSecondary>
            <p style="font-size: var(--flex-text-sm); color: var(--flex-color-text-muted);">
              Forms Lab — LLM-Assisted Forms Platform
            </p>
          </FooterSecondary>
        </Footer>
        <script type="module" src="/static/components.js"></script>
      </body>
    </html>
  )
}
