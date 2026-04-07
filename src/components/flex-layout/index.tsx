import type { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
  sidebar?: any
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
        <header class="site-header">
          <div class="l-center site-header-inner">
            <h1><a href="/">Forms Lab</a></h1>
            <p>LLM-Assisted Forms Platform</p>
            <nav class="site-nav">
              <a href="/">Home</a>
              <a href="/catalog">Catalog</a>
            </nav>
          </div>
        </header>
        <div class="l-center">
          {props.sidebar ? (
            <div class="l-sidebar">
              <aside class="catalog-sidebar">{props.sidebar}</aside>
              <main>
                <div class="l-stack">{props.children}</div>
              </main>
            </div>
          ) : (
            <main>
              <div class="l-stack">{props.children}</div>
            </main>
          )}
        </div>
        <footer class="site-footer">
          <div class="l-center site-footer-inner">
            <p>Forms Lab — LLM-Assisted Forms Platform</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
