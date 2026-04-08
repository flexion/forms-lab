import type { Child, FC, PropsWithChildren } from 'hono/jsx'

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
        <footer class="site-footer">
          <div class="l-center">
            <p>Forms Lab — LLM-Assisted Forms Platform</p>
          </div>
        </footer>
        <script type="module" src="/static/components.js"></script>
      </body>
    </html>
  )
}
