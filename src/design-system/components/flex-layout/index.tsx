import type { Child, FC, PropsWithChildren } from 'hono/jsx'
import { resolveUrl } from '../../../shared/base-path'
import { Banner } from '../flex-banner'
import {
  Footer,
  FooterNav,
  FooterPrimary,
  FooterReturnToTop,
  FooterSecondary,
} from '../flex-footer'
import { Header, HeaderNavItem, type HeaderUser } from '../flex-header'

interface LayoutProps {
  title?: string
  sidebar?: Child
  currentPath?: string
  user?: HeaderUser | null
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const title = props.title ? `${props.title} | Forms Lab` : 'Forms Lab'

  return (
    <html lang="en" data-theme="auto">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'||t==='dark'||t==='auto')document.documentElement.setAttribute('data-theme',t)})()`,
          }}
        />
        <link rel="stylesheet" href={resolveUrl('/static/styles.css')} />
      </head>
      <body>
        <Banner
          ariaLabel="A digital services project by Flexion"
          headerText="A digital services project by Flexion"
          headerImage={undefined}
          buttonText="About this project"
          guidance={[
            {
              icon: {
                src: `${resolveUrl('/static/sprite.svg')}#account_balance`,
                alt: 'Flexion',
                color: 'var(--flex-color-accent)',
              },
              heading: 'About Flexion',
              text: (
                <>
                  We build digital services for federal, state, and local
                  government agencies.{' '}
                  <a href="https://flexion.us">Learn more</a>.
                </>
              ),
            },
            {
              icon: {
                src: `${resolveUrl('/static/sprite.svg')}#github`,
                alt: 'GitHub',
                color: '#24292f',
              },
              heading: 'Open source',
              text: (
                <>
                  This project is developed in the open. View the source code on{' '}
                  <a href="https://github.com/flexion/forms-lab">GitHub</a>.
                </>
              ),
            },
          ]}
        />
        <Header
          user={props.user ?? undefined}
          signoutAction={resolveUrl('/auth/signout')}
        >
          <HeaderNavItem
            href={resolveUrl('/')}
            label="Home"
            current={props.currentPath === '/'}
          />
          <HeaderNavItem
            href={resolveUrl('/forms')}
            label="Forms"
            current={props.currentPath === '/forms'}
          />
          <HeaderNavItem
            href={resolveUrl('/catalog')}
            label="Catalog"
            current={props.currentPath?.startsWith('/catalog') ?? false}
          />
          {props.user ? (
            <>
              <HeaderNavItem
                href={resolveUrl('/projects')}
                label="Projects"
                current={props.currentPath?.startsWith('/projects') ?? false}
              />
              <HeaderNavItem
                href={resolveUrl('/forms/sessions')}
                label="My Sessions"
                current={props.currentPath === '/forms/sessions'}
              />
            </>
          ) : (
            <HeaderNavItem href={resolveUrl('/auth/signin')} label="Sign in" />
          )}
        </Header>
        {props.sidebar ? (
          <div class="catalog-layout">
            <aside class="catalog-sidebar">
              <details class="catalog-nav-toggle" open>
                <summary>In this section</summary>
                {props.sidebar}
              </details>
              <script
                dangerouslySetInnerHTML={{
                  __html: `(function(){var d=document.querySelector(".catalog-nav-toggle");function u(){if(innerWidth<=768)d.removeAttribute("open");else d.setAttribute("open","")}u();addEventListener("resize",u)}())`,
                }}
              />
            </aside>
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
                  <a class="flex-footer__primary-link" href={resolveUrl('/')}>
                    Home
                  </a>
                </li>
                <li>
                  <a
                    class="flex-footer__primary-link"
                    href={resolveUrl('/catalog')}
                  >
                    Catalog
                  </a>
                </li>
                <li>
                  <a
                    class="flex-footer__primary-link"
                    href={resolveUrl('/projects')}
                  >
                    Projects
                  </a>
                </li>
                <li>
                  <a
                    class="flex-footer__primary-link"
                    href={resolveUrl('/catalog/design-system')}
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
        <script
          type="module"
          src={resolveUrl('/static/components.js')}
        ></script>
      </body>
    </html>
  )
}
