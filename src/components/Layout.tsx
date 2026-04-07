import type { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
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
          <h1>Forms Lab</h1>
          <p>LLM-Assisted Forms Platform</p>
          <nav class="site-nav">
            <a href="/">Home</a>
            <a href="/catalog">Catalog</a>
            <a href="/catalog/personas">Personas</a>
            <a href="/catalog/decisions">Decisions</a>
            <a href="/catalog/architecture">Architecture</a>
            <a href="/catalog/stories">Stories</a>
          </nav>
        </header>
        <main class="l-center">
          <div class="l-stack">{props.children}</div>
        </main>
      </body>
    </html>
  )
}
