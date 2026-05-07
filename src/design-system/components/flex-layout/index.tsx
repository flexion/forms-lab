import type { Child, FC, PropsWithChildren } from 'hono/jsx'
import { resolveUrl } from '../../../shared/base-path'
import { Banner } from '../flex-banner'
import {
  Footer,
  FooterNav,
  FooterPrimary,
  FooterSecondary,
} from '../flex-footer'
import { Header, HeaderNavItem, type HeaderUser } from '../flex-header'

interface LayoutProps {
  title?: string
  sidebar?: Child
  currentSection?: 'home' | 'forms' | 'projects' | 'catalog' | 'admin'
  user?: HeaderUser | null
  contentWidth?: 'centered' | 'full'
}

function isAdminUser(login: string): boolean {
  const admins = (process.env.ADMIN_USERS ?? 'danielnaab')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
  return admins.includes(login)
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const title = props.title ? `${props.title} | Forms Lab` : 'Forms Lab'

  const isHome = props.currentSection === 'home'
  const isForms = props.currentSection === 'forms'
  const isProjects = props.currentSection === 'projects'
  const isCatalog = props.currentSection === 'catalog'
  const isAdmin = props.currentSection === 'admin'

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
          logoHref={resolveUrl('/')}
          user={props.user ?? undefined}
          signoutAction={resolveUrl('/auth/signout')}
          settingsHref={
            props.user ? resolveUrl('/settings/variants') : undefined
          }
        >
          <HeaderNavItem href={resolveUrl('/')} label="Home" current={isHome} />
          {props.user ? (
            <>
              <HeaderNavItem
                href={resolveUrl('/forms')}
                label="Forms"
                current={isForms}
              />
              <HeaderNavItem
                href={resolveUrl('/projects')}
                label="Projects"
                current={isProjects}
              />
              <HeaderNavItem
                href={resolveUrl('/catalog')}
                label="Catalog"
                current={isCatalog}
              />
              {isAdminUser(props.user.login) && (
                <HeaderNavItem
                  href={resolveUrl('/admin/users')}
                  label="Admin"
                  current={isAdmin}
                />
              )}
            </>
          ) : (
            <>
              <HeaderNavItem
                href={resolveUrl('/forms')}
                label="Forms"
                current={isForms}
              />
              <HeaderNavItem
                href={resolveUrl('/projects')}
                label="Projects"
                current={isProjects}
              />
              <HeaderNavItem
                href={resolveUrl('/catalog')}
                label="Catalog"
                current={isCatalog}
              />
              <HeaderNavItem
                href={resolveUrl('/auth/signin')}
                label="Sign in"
              />
            </>
          )}
        </Header>
        {props.sidebar ? (
          <div class="l-page-sidebar-start">
            <aside class="l-page-sidebar catalog-sidebar">
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
            <main class="l-page-main">
              <div class="l-stack">{props.children}</div>
            </main>
          </div>
        ) : (
          <main
            class={
              props.contentWidth === 'full'
                ? 'l-page-content--full'
                : 'l-page-content'
            }
          >
            {props.contentWidth === 'full' ? (
              props.children
            ) : (
              <div class="l-stack">{props.children}</div>
            )}
          </main>
        )}
        {props.contentWidth !== 'full' && (
          <Footer variant="slim">
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
                  {props.user && (
                    <li>
                      <a
                        class="flex-footer__primary-link"
                        href={resolveUrl(`/${props.user.login}`)}
                      >
                        Projects
                      </a>
                    </li>
                  )}
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
        )}
        <script
          type="module"
          src={resolveUrl('/static/components.js')}
        ></script>
      </body>
    </html>
  )
}
