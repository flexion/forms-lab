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
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            background: #f9fafb;
            padding: 1rem;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
          }

          header {
            background: white;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          header h1 {
            font-size: 1.875rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }

          header p {
            color: #6b7280;
          }

          nav {
            margin-top: 1rem;
            display: flex;
            gap: 1rem;
          }

          nav a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
          }

          nav a:hover {
            text-decoration: underline;
          }

          main {
            background: white;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          h1, h2, h3 {
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
          }

          h1 { font-size: 1.875rem; }
          h2 { font-size: 1.5rem; }
          h3 { font-size: 1.25rem; }

          p {
            margin-bottom: 1rem;
          }

          ul {
            margin-left: 1.5rem;
            margin-bottom: 1rem;
          }

          code {
            background: #f3f4f6;
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
          }
        `}</style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>Forms Lab</h1>
            <p>LLM-Assisted Forms Platform</p>
            <nav>
              <a href="/">Home</a>
              <a href="/catalog/personas">Personas</a>
            </nav>
          </header>
          <main>{props.children}</main>
        </div>
      </body>
    </html>
  )
}
